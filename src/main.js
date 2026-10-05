import ForceGraph3D from '3d-force-graph'
import * as THREE from 'three'

import {
  FilesetResolver,
  HandLandmarker
} from '@mediapipe/tasks-vision'

import './style.css'


// ======================================================
// 0. 상태 변수
// ======================================================

let hoveredNode = null
let grabbedNode = null

let isPinching = false
let wasPinching = false

let cursorX = 0
let cursorY = 0

// 노드를 잡은 순간의 상태
let grabStartCursorX = 0
let grabStartCursorY = 0

let grabStartNodeX = 0
let grabStartNodeY = 0
let grabStartNodeZ = 0

// 선택 범위
const NODE_PICK_RADIUS = 70

// PINCH 시작/해제 기준을 다르게 설정
const PINCH_START_THRESHOLD = 0.045
const PINCH_RELEASE_THRESHOLD = 0.075


// ======================================================
// 1. 화면 구성
// ======================================================

document.querySelector('#app').innerHTML = `
  <div id="graph"></div>

  <div class="info">
    <h1>3D Force-Directed Graph</h1>
    <p>Les Misérables character network</p>

    <hr>

    <p>Hand Cursor → Hover</p>
    <p>Pinch → Grab</p>
    <p>Open → Release</p>
  </div>

  <div class="camera-container">

    <video
      id="webcam"
      autoplay
      playsinline
    ></video>

    <canvas id="hand-canvas"></canvas>

    <div class="camera-label">
      HAND TRACKING
    </div>

    <div id="gesture-status">
      NO HAND
    </div>

  </div>

  <div id="hand-cursor"></div>
`


// ======================================================
// 2. 3D Force Graph
// ======================================================

const Graph = new ForceGraph3D(
  document.getElementById('graph')
)

Graph
  .width(window.innerWidth)
  .height(window.innerHeight)

  .backgroundColor('#080b14')

  .nodeLabel(node => node.id)

  .nodeAutoColorBy('group')

  .nodeRelSize(5)

  .nodeVal(node => {

    if (node === grabbedNode) {
      return 3
    }

    if (node === hoveredNode) {
      return 2
    }

    return 1
  })

  .linkWidth(link =>
    Math.sqrt(link.value || 1)
  )

  .linkOpacity(0.35)


// ======================================================
// 3. 데이터
// ======================================================

fetch(
  'https://raw.githubusercontent.com/vasturiano/3d-force-graph/master/example/datasets/miserables.json'
)

  .then(response => {

    if (!response.ok) {
      throw new Error(
        '데이터를 불러오지 못했습니다.'
      )
    }

    return response.json()
  })

  .then(data => {

    console.log('Loaded graph data:', data)
    console.log('Nodes:', data.nodes.length)
    console.log('Links:', data.links.length)

    Graph.graphData(data)

    Graph.cameraPosition({
      x: 0,
      y: 0,
      z: 300
    })
  })

  .catch(error => {

    console.error(
      'Graph data loading error:',
      error
    )

  })


// ======================================================
// 4. Webcam
// ======================================================

const video =
  document.querySelector('#webcam')


async function startWebcam() {

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        },

        audio: false

      })

    video.srcObject = stream

    await video.play()

    console.log('Webcam started!')

  }

  catch (error) {

    console.error(
      'Webcam error:',
      error
    )

  }
}


startWebcam()


// ======================================================
// 5. MediaPipe 기본 설정
// ======================================================

const canvas =
  document.querySelector('#hand-canvas')

const ctx =
  canvas.getContext('2d')

const gestureStatus =
  document.querySelector('#gesture-status')

const handCursor =
  document.querySelector('#hand-cursor')


let handLandmarker = null
let lastVideoTime = -1


// ======================================================
// 6. MediaPipe 초기화
// ======================================================

async function createHandLandmarker() {

  const vision =
    await FilesetResolver.forVisionTasks(

      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

    )

  handLandmarker =
    await HandLandmarker.createFromOptions(

      vision,

      {
        baseOptions: {

          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

        },

        runningMode: 'VIDEO',

        numHands: 1
      }

    )

  console.log(
    'MediaPipe HandLandmarker ready!'
  )

  requestAnimationFrame(detectHands)
}


// ======================================================
// 7. 손 감지
// ======================================================

function detectHands() {

  if (
    handLandmarker &&
    video.readyState >= 2 &&
    video.currentTime !== lastVideoTime
  ) {

    lastVideoTime =
      video.currentTime

    canvas.width =
      video.videoWidth

    canvas.height =
      video.videoHeight

    const results =
      handLandmarker.detectForVideo(
        video,
        performance.now()
      )

    drawHands(results)
  }

  requestAnimationFrame(detectHands)
}


// ======================================================
// 8. 3D Node → Screen 좌표
// ======================================================

function getNodeScreenPosition(node) {

  if (
    node.x == null ||
    node.y == null ||
    node.z == null
  ) {
    return null
  }

  const camera =
    Graph.camera()

  const renderer =
    Graph.renderer()

  const position =
    new THREE.Vector3(
      node.x,
      node.y,
      node.z
    )

  position.project(camera)

  const rect =
    renderer.domElement
      .getBoundingClientRect()

  return {

    x:
      rect.left +
      ((position.x + 1) / 2) *
      rect.width,

    y:
      rect.top +
      ((-position.y + 1) / 2) *
      rect.height

  }
}


// ======================================================
// 9. 가장 가까운 노드 찾기
// ======================================================

function findNearestNode(x, y) {

  const nodes =
    Graph.graphData().nodes

  let nearestNode = null
  let nearestDistance =
    NODE_PICK_RADIUS

  nodes.forEach(node => {

    const position =
      getNodeScreenPosition(node)

    if (!position) return

    const dx =
      position.x - x

    const dy =
      position.y - y

    const distance =
      Math.hypot(dx, dy)

    if (
      distance <
      nearestDistance
    ) {

      nearestDistance =
        distance

      nearestNode =
        node
    }

  })

  return nearestNode
}


// ======================================================
// 10. 노드 놓기
// ======================================================

function releaseGrabbedNode() {

  if (!grabbedNode) {
    return
  }

  console.log(
    'RELEASE:',
    grabbedNode.id
  )

  grabbedNode.fx = null
  grabbedNode.fy = null
  grabbedNode.fz = null

  grabbedNode = null
}


// ======================================================
// 11. 손 Landmark + Gesture
// ======================================================

function drawHands(results) {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  )


  // ==================================================
  // 손 없음
  // ==================================================

  if (!results.landmarks?.length) {

    gestureStatus.textContent =
      'NO HAND'

    handCursor.style.display =
      'none'

    handCursor.classList.remove(
      'pinching'
    )

    isPinching = false
    wasPinching = false

    hoveredNode = null

    releaseGrabbedNode()

    return
  }


  const landmarks =
    results.landmarks[0]


  // ==================================================
  // Landmark 표시
  // ==================================================

  landmarks.forEach(point => {

    const x =
      point.x *
      canvas.width

    const y =
      point.y *
      canvas.height

    ctx.beginPath()

    ctx.arc(
      x,
      y,
      5,
      0,
      Math.PI * 2
    )

    ctx.fillStyle =
      '#00ff88'

    ctx.fill()
  })


  // ==================================================
  // 엄지 / 검지
  // ==================================================

  const thumbTip =
    landmarks[4]

  const indexTip =
    landmarks[8]


  // ==================================================
  // Pinch 거리
  // ==================================================

  const pinchDistance =
    Math.hypot(

      thumbTip.x -
      indexTip.x,

      thumbTip.y -
      indexTip.y

    )


  // ==========================
// PINCH hysteresis
// ==========================

// 아직 pinch 상태가 아닐 때
if (!isPinching) {

  // 손가락이 충분히 가까워져야 PINCH 시작
  if (pinchDistance < PINCH_START_THRESHOLD) {
    isPinching = true
  }

}

// 이미 pinch 상태일 때
else {

  // 시작 기준보다 훨씬 멀어져야 RELEASE
  if (pinchDistance > PINCH_RELEASE_THRESHOLD) {
    isPinching = false
  }

}


  // ==================================================
  // Gesture 표시
  // ==================================================

  if (isPinching) {

  gestureStatus.textContent =
    `PINCH ${pinchDistance.toFixed(3)}`

    handCursor.classList.add(
      'pinching'
    )

  }

  else {

  gestureStatus.textContent =
    `OPEN ${pinchDistance.toFixed(3)}`

    handCursor.classList.remove(
      'pinching'
    )

  }


  // ==================================================
  // ★ Grab Cursor
  //
  // 검지 하나가 아니라
  // 엄지 + 검지 사이의 중점
  // ==================================================

  const pinchCenterX =
    (
      thumbTip.x +
      indexTip.x
    ) / 2

  const pinchCenterY =
    (
      thumbTip.y +
      indexTip.y
    ) / 2


  // 카메라가 mirror 상태이므로 X 반전
  cursorX =
    (1 - pinchCenterX) *
    window.innerWidth

  cursorY =
    pinchCenterY *
    window.innerHeight


  // ==================================================
  // Cursor 표시
  // ==================================================

  handCursor.style.display =
    'block'

  handCursor.style.left =
    `${cursorX}px`

  handCursor.style.top =
    `${cursorY}px`


  // ==================================================
  // Hover Node 검색
  // ==================================================

  if (!grabbedNode) {

    hoveredNode =
      findNearestNode(
        cursorX,
        cursorY
      )

  }


  // ==================================================
  // PINCH 시작 → GRAB
  // ==================================================

  if (
    isPinching &&
    !wasPinching &&
    hoveredNode
  ) {

    grabbedNode =
      hoveredNode


    // 잡은 순간 손 위치
    grabStartCursorX =
      cursorX

    grabStartCursorY =
      cursorY


    // 잡은 순간 노드 위치
    grabStartNodeX =
      grabbedNode.x

    grabStartNodeY =
      grabbedNode.y

    grabStartNodeZ =
      grabbedNode.z


    // 현재 위치에 고정
    grabbedNode.fx =
      grabStartNodeX

    grabbedNode.fy =
      grabStartNodeY

    grabbedNode.fz =
      grabStartNodeZ


    // force simulation 재활성화
    Graph.d3ReheatSimulation()


    console.log(
      'GRAB:',
      grabbedNode.id
    )
  }


  // ==================================================
// 잡고 있는 동안 이동
// ==================================================

if (
  isPinching &&
  grabbedNode
) {

  const deltaX =
    cursorX - grabStartCursorX

  const deltaY =
    cursorY - grabStartCursorY

  const MOVE_SCALE = 0.20

  grabbedNode.fx =
    grabStartNodeX +
    deltaX * MOVE_SCALE

  grabbedNode.fy =
    grabStartNodeY -
    deltaY * MOVE_SCALE

  grabbedNode.fz =
    grabStartNodeZ

  // 디버깅용
  console.log(
    'MOVING',
    grabbedNode.id,
    'deltaX:',
    deltaX.toFixed(1),
    'deltaY:',
    deltaY.toFixed(1),
    'fx:',
    grabbedNode.fx.toFixed(1),
    'fy:',
    grabbedNode.fy.toFixed(1)
  )
}


  // ==================================================
  // PINCH 종료 → RELEASE
  // ==================================================

  if (
    !isPinching &&
    wasPinching &&
    grabbedNode
  ) {

    releaseGrabbedNode()

  }


  // ==================================================
  // 다음 프레임용 상태 저장
  // ==================================================

  wasPinching =
    isPinching
}


// ======================================================
// 12. Resize
// ======================================================

window.addEventListener(
  'resize',
  () => {

    Graph
      .width(
        window.innerWidth
      )
      .height(
        window.innerHeight
      )

  }
)


// ======================================================
// 13. 시작
// ======================================================

createHandLandmarker()