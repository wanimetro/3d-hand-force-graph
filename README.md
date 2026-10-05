# 3D Hand-Interactive Force-Directed Graph

웹캠 기반 Hand Tracking을 활용하여  
3D Force-Directed Graph의 노드를 손으로 직접 선택하고 이동할 수 있도록 구현한 인터랙션 프로토타입입니다.

기존 2D Force-Directed Graph를 3차원 공간으로 확장하고, 마우스뿐만 아니라 실제 손동작을 이용해 그래프를 탐색하고 조작하는 것을 목표로 합니다.

---

## Project Overview

기존 Force-Directed Graph는 마우스를 이용해 노드를 선택하거나 드래그하는 방식으로 상호작용합니다.

이 프로젝트에서는 이를 3D 환경으로 확장하고, 노트북 웹캠을 통해 사용자의 손을 인식하여 실제 공간에서 물체를 집는 것과 유사한 방식으로 노드를 조작할 수 있도록 구현하고 있습니다.

현재는 엄지와 검지를 이용한 **Pinch Gesture**를 통해 노드를 선택하고 이동시키는 기능을 구현했습니다.

### Interaction Flow

```text
Webcam
   ↓
MediaPipe Hand Tracking
   ↓
Hand Landmarks
   ↓
Thumb + Index Finger
   ↓
Pinch Detection
   ↓
Node Selection
   ↓
Grab
   ↓
Hand Movement
   ↓
3D Node Movement
   ↓
Open Hand
   ↓
Release
```

---

## Current Features

### 1. 3D Force-Directed Graph

Les Misérables character network 데이터를 3차원 Force-Directed Graph로 시각화합니다.

- 77 Nodes
- 254 Links
- Force-based node positioning
- Node group color visualization
- 3D camera rotation / zoom / movement

### 2. Webcam Hand Tracking

노트북 내장 웹캠을 사용하여 실시간으로 손을 인식합니다.

MediaPipe Hand Landmarker를 이용해 손의 21개 Landmark를 추적합니다.

### 3. Pinch Gesture Detection

엄지 끝과 검지 끝의 거리를 계산하여 손의 상태를 구분합니다.

```text
OPEN
  ↓
PINCH
  ↓
GRAB NODE
  ↓
MOVE
  ↓
OPEN
  ↓
RELEASE NODE
```

Pinch 시작과 해제에 서로 다른 threshold를 적용하여 손동작 인식이 불안정하게 전환되는 현상을 줄였습니다.

### 4. Hand Cursor

엄지와 검지 사이의 중점을 화면상의 Hand Cursor로 변환합니다.

웹캠 영상의 손 위치를 그래프 화면 좌표와 연결하여 사용자가 어떤 위치를 가리키고 있는지 확인할 수 있습니다.

### 5. Node Grab & Move

Hand Cursor 근처의 노드를 탐색한 뒤 Pinch Gesture가 발생하면 해당 노드를 선택합니다.

Pinch 상태를 유지한 채 손을 움직이면 손의 이동량에 따라 선택된 노드의 위치가 변경됩니다.

손가락을 다시 벌리면 노드가 Release됩니다.

---

## Tech Stack

- JavaScript
- Vite
- Three.js
- 3d-force-graph
- MediaPipe Tasks Vision
- WebRTC / getUserMedia

---

## Getting Started

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

브라우저에서 Vite가 제공하는 Local 주소로 접속합니다.

예:

```text
http://localhost:5173
```

웹캠 사용 권한을 허용해야 Hand Tracking 기능을 사용할 수 있습니다.

---

## Controls

### Mouse

| Input | Action |
|---|---|
| Left Drag | Rotate graph |
| Mouse Wheel | Zoom |
| Right Drag | Move camera |

### Hand Gesture

| Gesture | Action |
|---|---|
| Move Hand | Move hand cursor |
| Pinch | Grab node |
| Pinch + Move | Move selected node |
| Open Hand | Release node |

---

## Data

그래프 데이터는 Les Misérables 등장인물 간의 관계 데이터를 사용합니다.

현재 데이터 구성:

```text
Nodes: 77
Links: 254
```

2D Force-Directed Graph 예제를 기반으로 동일한 관계 데이터를 3D 공간에서 탐색할 수 있도록 확장했습니다.

---

## Current Progress

- [x] 2D Force-Directed Graph 구조 분석
- [x] 3D Force-Directed Graph 구현
- [x] Les Misérables dataset 적용
- [x] Webcam 연결
- [x] MediaPipe Hand Tracking
- [x] Hand Landmark visualization
- [x] Pinch Gesture detection
- [x] Hand Cursor 구현
- [x] Nearest Node detection
- [x] Node Grab
- [x] Hand movement tracking
- [x] Node X/Y movement
- [x] Node Release
- [ ] Z-axis interaction
- [ ] 3D interaction 개선
- [ ] Gesture 안정화
- [ ] Interaction feedback 개선

---

## Next Steps

현재는 손의 X/Y 이동을 이용하여 노드를 움직일 수 있습니다.

다음 단계에서는 다음 기능을 실험할 예정입니다.

1. 손과 카메라 사이의 거리 변화를 이용한 Z축 조작
2. 3D 카메라 방향을 고려한 자연스러운 Node Movement
3. Hover / Grab 상태에 대한 시각적 피드백 개선
4. Hand Tracking jitter 보정
5. Pinch Gesture 인식 안정화
6. 3D Graph 탐색을 위한 추가 Gesture Interaction

궁극적으로는 3차원 네트워크 데이터를 마우스 중심의 인터페이스가 아닌, 실제 손동작을 이용하여 보다 직관적으로 탐색할 수 있는 인터랙션 방식을 실험하는 것을 목표로 합니다.

---

## References

- D3 Force-Directed Graph  
  https://observablehq.com/@d3/force-directed-graph/2

- 3D Force Graph  
  https://github.com/vasturiano/3d-force-graph

- MediaPipe Hand Landmarker  
  https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker

---

## Development Status

This project is currently under development.

Current interaction:

**Hand Tracking → Pinch → Grab → Move → Release**