import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { inject } from '@vercel/analytics';

// Vercel Analyticsを初期化
inject();

// シーンの初期化
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005); // より暗い背景

// カメラの設定
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.z = 50;

// レンダラーの設定
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.sortObjects = true; // オブジェクトのソートを有効化
renderer.setClearColor(0x000005, 1); // 背景色を設定
renderer.autoClear = true; // 自動クリアを有効化
document.body.appendChild(renderer.domElement);

// 光源を追加（太陽光のような方向性のある光）
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(1000, 1000, 1000); // 斜め上から光を当てる
scene.add(sunLight);

// 環境光を追加（全体的に明るくする）
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// 移動コントロールの設定
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// 自動移動の設定
const autoMove = {
  enabled: true, // 自動移動をデフォルトで有効
  speed: 50.0, // 基本移動速度
  rotationSpeed: 0.0001, // 回転速度
  directionChangeInterval: 10000, // 方向変更の間隔（ミリ秒）
  lastDirectionChange: 0,
  direction: new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize(),
  // カメラの向きベクトル
  lookDirection: new THREE.Vector3(0, 0, -1),
  // 上下左右方向への変化量
  turnRate: {
    horizontal: 0,
    vertical: 0
  },
  // 地球への誘導モード
  earthGuidance: false, // 地球への誘導モードフラグ
  earthReached: false   // 地球到達フラグ
};

// キーボード操作の制御変数 - 自動移動の速度調整用
const keyControls = {
  speedUp: false,     // 加速
  speedDown: false,   // 減速
  stop: false,        // 一時停止/再開
  turnLeft: false,    // 左回転
  turnRight: false,   // 右回転
  turnUp: false,      // 上回転
  turnDown: false,    // 下回転
  earthMode: false    // 地球への誘導モード切替
};

// 星の色のパレット（より暗めの色に変更）
const starColors = [
  0x555533, // 暗めのイエロー
  0x443333, // 暗めの赤
  0x333344, // 暗めの青
  0x334433, // 暗めの緑
  0x555555, // 暗めの白
  0x332233  // 暗めの紫
];

// テクスチャローダー
const textureLoader = new THREE.TextureLoader();

// 地球の作成
function createEarth() {
  const earthGroup = new THREE.Group();

  // 地球の位置（遠く離れた場所）
  const earthPosition = new THREE.Vector3(
    -5000 + Math.random() * 2000,
    3000 + Math.random() * 1000,
    -7000 + Math.random() * 2000
  );

  // 地球本体
  const earthGeometry = new THREE.SphereGeometry(150, 64, 64);
  
  // 地球用マテリアル（より高品質なマテリアルを使用）
  const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x0077ff,
    shininess: 15,
    transparent: false,
    opacity: 1.0,
    depthWrite: true, // 深度バッファへの書き込みを確実に有効化
    depthTest: true   // 深度テストを確実に有効化
  });

  // もしオンラインでテクスチャが利用可能なら、テクスチャを使用
  try {
    // 地球用のテクスチャ（カスタムURLから）
    earthMaterial.map = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
    earthMaterial.needsUpdate = true;
  } catch (error) {
    console.log('Earth texture could not be loaded. Using default color.');
  }

  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earth.position.copy(earthPosition);
  earthGroup.add(earth);

  // 雲のレイヤー
  const cloudGeometry = new THREE.SphereGeometry(155, 64, 64);
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    alphaMap: generateCloudTexture(),
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: true
  });

  try {
    // 雲用のテクスチャ（カスタムURLから）
    cloudMaterial.alphaMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');
    cloudMaterial.needsUpdate = true;
  } catch (error) {
    console.log('Cloud texture could not be loaded. Using generated texture.');
  }

  const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
  clouds.position.copy(earthPosition);
  earthGroup.add(clouds);

  // 大気グロー効果
  const atmosphereGeometry = new THREE.SphereGeometry(180, 64, 64);
  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x0044aa,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  atmosphere.position.copy(earthPosition);
  earthGroup.add(atmosphere);

  // 太陽光方向からの輝き（追加のグロー効果）
  const sunlightGeometry = new THREE.SphereGeometry(190, 64, 64);
  const sunlightMaterial = new THREE.MeshBasicMaterial({
    color: 0x6688ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  });
  const sunlight = new THREE.Mesh(sunlightGeometry, sunlightMaterial);
  sunlight.position.copy(earthPosition);
  earthGroup.add(sunlight);

  // 地球到達判定用の衝突検出範囲
  const reachRadius = 400; // 地球に近づいたと判定する距離
  
  // 地球への方向ベクトル計算関数
  const getEarthDirection = () => {
    const toEarth = earthPosition.clone().sub(camera.position).normalize();
    return toEarth;
  };

  // 地球までの距離計算関数
  const getDistanceToEarth = () => {
    return camera.position.distanceTo(earthPosition);
  };

  // 地球到達チェック関数
  const checkEarthReached = () => {
    const distance = getDistanceToEarth();
    return distance < reachRadius;
  };

  scene.add(earthGroup);

  return {
    group: earthGroup,
    position: earthPosition,
    getDirection: getEarthDirection,
    getDistance: getDistanceToEarth,
    checkReached: checkEarthReached,
    clouds: clouds
  };
}

// クラウドテクスチャの生成（テクスチャがロードできない場合のフォールバック）
function generateCloudTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  // 透明な背景
  context.fillStyle = 'black';
  context.fillRect(0, 0, size, size);
  
  // ランダムな雲パターン
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 1 + Math.random() * 10;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (0.2 + Math.random() * 0.4) + ')');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 星の生成（シンプル版）
function createStars() {
  const starCount = 12000; // より多くの星
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // 球面上にランダムに配置
    const radius = 1000 + Math.random() * 5000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    
    // ランダムな色を割り当て
    const colorIndex = Math.floor(Math.random() * starColors.length);
    const color = new THREE.Color(starColors[colorIndex]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.5, // 小さめの星
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  
  // カメラに追従する星を追加（常に星空が見えるようにする）
  const nearStarsCount = 5000;
  const nearStarsGeometry = new THREE.BufferGeometry();
  const nearStarsPositions = new Float32Array(nearStarsCount * 3);
  const nearStarsColors = new Float32Array(nearStarsCount * 3);
  
  for (let i = 0; i < nearStarsCount; i++) {
    // カメラ周囲の球面上にランダムに配置
    const radius = 200 + Math.random() * 300;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    nearStarsPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    nearStarsPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    nearStarsPositions[i * 3 + 2] = radius * Math.cos(phi);
    
    // 少し暗めの星
    const colorIndex = Math.floor(Math.random() * starColors.length);
    const color = new THREE.Color(starColors[colorIndex]);
    // 輝度を少し下げる
    color.multiplyScalar(0.7);
    nearStarsColors[i * 3] = color.r;
    nearStarsColors[i * 3 + 1] = color.g;
    nearStarsColors[i * 3 + 2] = color.b;
  }
  
  nearStarsGeometry.setAttribute('position', new THREE.BufferAttribute(nearStarsPositions, 3));
  nearStarsGeometry.setAttribute('color', new THREE.BufferAttribute(nearStarsColors, 3));
  
  const nearStarsMaterial = new THREE.PointsMaterial({
    size: 1.2,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending
  });
  
  const nearStars = new THREE.Points(nearStarsGeometry, nearStarsMaterial);
  camera.add(nearStars); // カメラに追従させる
  
  return stars;
}

// 星雲の作成（シンプル版 - 背景として固定）
function createNebula() {
  const nebulaCount = 8;
  const nebulaGroup = new THREE.Group();
  
  for (let i = 0; i < nebulaCount; i++) {
    // より遠くにランダムに配置（スカイボックスのように）
    const radius = 2000 + Math.random() * 6000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // 星雲の色（暗めの色）
    const colors = [
      0x220000, // 暗い赤
      0x000022, // 暗い青
      0x002200, // 暗い緑
      0x220022, // 暗い紫
      0x002222  // 暗いシアン
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // 星雲用のパーティクル
    const particleCount = 600;
    const nebulaGeometry = new THREE.BufferGeometry();
    const nebulaPositions = new Float32Array(particleCount * 3);
    
    for (let j = 0; j < particleCount; j++) {
      // ランダムな位置（雲状に広がる）
      const size = 250 + Math.random() * 350;
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * size,
        (Math.random() - 0.5) * size,
        (Math.random() - 0.5) * size
      );
      
      nebulaPositions[j * 3] = x + offset.x;
      nebulaPositions[j * 3 + 1] = y + offset.y;
      nebulaPositions[j * 3 + 2] = z + offset.z;
    }
    
    nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
    
    const nebulaMaterial = new THREE.PointsMaterial({
      color: color,
      size: 6,
      transparent: true,
      opacity: 0.1, // より透明に
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    
    const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    nebulaGroup.add(nebula);
  }
  
  scene.add(nebulaGroup);
  return nebulaGroup;
}

// 銀河の作成（シンプル版）
function createGalaxies() {
  const galaxyCount = 7;
  const galaxyGroup = new THREE.Group();
  
  for (let i = 0; i < galaxyCount; i++) {
    // 遠くにランダムに配置
    const radius = 5000 + Math.random() * 3000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // 銀河の色（暗めの色）
    const galaxyColors = [0x332211, 0x112233, 0x221133];
    const galaxyColor = galaxyColors[Math.floor(Math.random() * galaxyColors.length)];
    
    // 渦巻銀河用のパーティクル
    const particleCount = 1500;
    const galaxyGeometry = new THREE.BufferGeometry();
    const galaxyPositions = new Float32Array(particleCount * 3);
    
    const size = 400;
    for (let j = 0; j < particleCount; j++) {
      // シンプルな渦巻銀河の形状
      const t = Math.random() * 2 * Math.PI; // 角度
      const r = Math.random() * size; // 半径
      const spiral = t + r / 30; // 渦巻き効果
      
      const posX = Math.cos(spiral) * r;
      const posY = Math.sin(spiral) * r;
      const posZ = (Math.random() - 0.5) * 10; // より薄い円盤
      
      galaxyPositions[j * 3] = x + posX;
      galaxyPositions[j * 3 + 1] = y + posY;
      galaxyPositions[j * 3 + 2] = z + posZ;
    }
    
    galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3));
    
    const galaxyMaterial = new THREE.PointsMaterial({
      color: galaxyColor,
      size: 2,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    
    const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
    // 銀河を傾ける
    galaxy.rotation.x = Math.random() * Math.PI;
    galaxy.rotation.y = Math.random() * Math.PI;
    
    galaxyGroup.add(galaxy);
  }
  
  scene.add(galaxyGroup);
  return galaxyGroup;
}

const stars = createStars();
const nebulae = createNebula();
const galaxies = createGalaxies();
const earth = createEarth();

// 星雲を背景として固定（カメラに追従させる処理を削除）
// scene.add(nebulae);
// nebulae.position.set(0, 0, 0); // 位置を原点に
// nebulae.rotation.set(0, 0, 0); // 回転をリセット

// オート移動のための方向変更関数
function changeDirection() {
  const now = Date.now();
  if (now - autoMove.lastDirectionChange > autoMove.directionChangeInterval) {
    // 地球誘導モードなら地球方向へ
    if (autoMove.earthGuidance) {
      // 地球へのベクトルを取得
      autoMove.direction = earth.getDirection();
      // 少しランダム性を加える（完全に直線的にならないように）
      autoMove.direction.x += (Math.random() - 0.5) * 0.05;
      autoMove.direction.y += (Math.random() - 0.5) * 0.05;
      autoMove.direction.z += (Math.random() - 0.5) * 0.05;
      autoMove.direction.normalize();
    } else {
      // 通常の方向変更
      const randomFactor = 0.2; // 小さいほど変化が穏やか
      autoMove.direction.x += (Math.random() - 0.5) * randomFactor;
      autoMove.direction.y += (Math.random() - 0.5) * randomFactor;
      autoMove.direction.z += (Math.random() - 0.5) * randomFactor;
      autoMove.direction.normalize();
    }
    
    // 回転方向も少し変える
    autoMove.turnRate.horizontal = (Math.random() - 0.5) * 0.001;
    autoMove.turnRate.vertical = (Math.random() - 0.5) * 0.0005;
    
    autoMove.lastDirectionChange = now;
  }
}

// 地球到達時の処理
function handleEarthReach() {
  if (!autoMove.earthReached && earth.checkReached()) {
    autoMove.earthReached = true;
    
    // 地球到達メッセージを表示
    const earthMessage = document.createElement('div');
    earthMessage.style.position = 'absolute';
    earthMessage.style.top = '50%';
    earthMessage.style.left = '50%';
    earthMessage.style.transform = 'translate(-50%, -50%)';
    earthMessage.style.color = 'white';
    earthMessage.style.fontSize = '2em';
    earthMessage.style.textAlign = 'center';
    earthMessage.style.textShadow = '0 0 10px rgba(0, 100, 255, 0.8)';
    earthMessage.style.backgroundColor = 'rgba(0, 0, 50, 0.5)';
    earthMessage.style.padding = '20px';
    earthMessage.style.borderRadius = '10px';
    earthMessage.style.zIndex = '1000';
    earthMessage.innerHTML = 'You\'ve reached Earth!<br>Welcome home!';
    document.body.appendChild(earthMessage);
    
    // 一定時間後にメッセージを消す
    setTimeout(() => {
      document.body.removeChild(earthMessage);
    }, 5000);
    
    // 地球誘導モードを解除
    autoMove.earthGuidance = false;
    
    // 地球周辺で移動速度を下げる
    autoMove.speed = 20;
    
    // 地球を中心に見るような軌道へ
    setupEarthOrbit();
  }
}

// 地球周回軌道をセットアップ
function setupEarthOrbit() {
  // 地球への方向ベクトル
  const toEarthDir = earth.getDirection();
  
  // 横方向の軌道ベクトルを生成（地球を中心に見るように）
  const upVector = new THREE.Vector3(0, 1, 0);
  
  // 横方向ベクトル（地球の周りを回る）
  const orbitDirection = new THREE.Vector3().crossVectors(
    toEarthDir,
    upVector
  ).normalize();
  
  // カメラの向きを地球中心に向ける
  const lookAtEarth = () => {
    // カメラから地球中心へのベクトル
    const toEarth = earth.position.clone().sub(camera.position);
    
    // カメラの向きを地球中心に
    camera.lookAt(earth.position);
    
    // カメラの現在の向きを維持したまま、移動方向を軌道方向に設定
    autoMove.direction.copy(orbitDirection);
  };
  
  // 即座に地球を中心に
  lookAtEarth();
  
  // 2秒ごとに向きを調整（常に地球を中心に）
  const earthViewInterval = setInterval(() => {
    if (autoMove.earthReached) {
      lookAtEarth();
    } else {
      clearInterval(earthViewInterval);
    }
  }, 2000);
  
  // 移動方向を軌道方向に設定
  autoMove.direction.copy(orbitDirection);
}

// 地球との距離表示を更新
function updateEarthDistanceInfo() {
  const distance = earth.getDistance();
  const distanceKm = Math.round(distance / 10); // 単位調整（仮想的なスケール）
  
  // 距離情報を更新
  const earthInfoElement = document.getElementById('earth-info');
  if (earthInfoElement) {
    earthInfoElement.innerHTML = `Distance to Earth: ${distanceKm.toLocaleString()} km`;
    // 距離に応じた色の変化（近いほど青くなる）
    const colorValue = Math.min(255, Math.max(0, Math.floor(255 * (distance - 400) / 5000)));
    earthInfoElement.style.color = `rgb(${colorValue}, ${colorValue}, 255)`;
  }
}

// 地球情報表示エリアの作成
const earthInfoElement = document.createElement('div');
earthInfoElement.id = 'earth-info';
earthInfoElement.style.position = 'absolute';
earthInfoElement.style.top = '80px';
earthInfoElement.style.left = '10px';
earthInfoElement.style.color = 'white';
earthInfoElement.style.backgroundColor = 'rgba(0, 0, 30, 0.5)';
earthInfoElement.style.padding = '5px 10px';
earthInfoElement.style.borderRadius = '5px';
earthInfoElement.style.fontFamily = 'Arial, sans-serif';
earthInfoElement.style.fontSize = '14px';
earthInfoElement.innerHTML = 'Distance to Earth: Calculating...';
document.body.appendChild(earthInfoElement);

// UI情報要素の追加
const infoElement = document.createElement('div');
infoElement.classList.add('info');
infoElement.innerHTML = 'Space Walk';
document.body.appendChild(infoElement);

const controlsElement = document.createElement('div');
controlsElement.classList.add('controls');
controlsElement.innerHTML = `
Controls:<br>
Space - Pause/Resume<br>
↑/↓ - Speed up/down<br>
←/→/↑↓ - Change direction<br>
E - Toggle Earth guidance mode<br>
`;
document.body.appendChild(controlsElement);

// イベントリスナー
document.addEventListener('click', () => {
  controls.lock();
});

// キーボード操作制御（自動移動の速度や方向調整用）
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'Space':
      autoMove.enabled = !autoMove.enabled;
      break;
    case 'ArrowUp':
      if (event.shiftKey) {
        keyControls.turnUp = true;
      } else {
        keyControls.speedUp = true;
      }
      break;
    case 'ArrowDown':
      if (event.shiftKey) {
        keyControls.turnDown = true;
      } else {
        keyControls.speedDown = true;
      }
      break;
    case 'ArrowLeft':
      keyControls.turnLeft = true;
      break;
    case 'ArrowRight':
      keyControls.turnRight = true;
      break;
    case 'KeyE':
      // 地球誘導モードの切り替え
      autoMove.earthGuidance = !autoMove.earthGuidance;
      const guidanceStatus = autoMove.earthGuidance ? 'Enabled' : 'Disabled';
      console.log(`Earth guidance mode: ${guidanceStatus}`);
      // 誘導モード切替メッセージ表示
      const modeMessage = document.createElement('div');
      modeMessage.style.position = 'absolute';
      modeMessage.style.top = '50%';
      modeMessage.style.left = '50%';
      modeMessage.style.transform = 'translate(-50%, -50%)';
      modeMessage.style.color = 'white';
      modeMessage.style.backgroundColor = autoMove.earthGuidance ? 'rgba(0, 100, 255, 0.5)' : 'rgba(100, 100, 100, 0.5)';
      modeMessage.style.padding = '10px';
      modeMessage.style.borderRadius = '5px';
      modeMessage.style.zIndex = '100';
      modeMessage.innerHTML = `Earth guidance mode: ${guidanceStatus}`;
      document.body.appendChild(modeMessage);
      setTimeout(() => {
        document.body.removeChild(modeMessage);
      }, 2000);
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'ArrowUp':
      keyControls.speedUp = false;
      keyControls.turnUp = false;
      break;
    case 'ArrowDown':
      keyControls.speedDown = false;
      keyControls.turnDown = false;
      break;
    case 'ArrowLeft':
      keyControls.turnLeft = false;
      break;
    case 'ArrowRight':
      keyControls.turnRight = false;
      break;
  }
});

// ウィンドウリサイズ処理
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// アニメーションループ
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const time = Date.now() * 0.001;
  
  // 自動移動の処理
  if (autoMove.enabled) {
    // 方向を時々変更
    changeDirection();
    
    // キーボード入力による速度調整
    let currentSpeed = autoMove.speed;
    if (keyControls.speedUp) currentSpeed *= 1.5;
    if (keyControls.speedDown) currentSpeed *= 0.7;
    
    // キーボード入力による方向調整
    if (keyControls.turnLeft) {
      // 左に回転させる
      const rotationMatrix = new THREE.Matrix4().makeRotationY(0.01);
      autoMove.direction.applyMatrix4(rotationMatrix);
    }
    if (keyControls.turnRight) {
      // 右に回転させる
      const rotationMatrix = new THREE.Matrix4().makeRotationY(-0.01);
      autoMove.direction.applyMatrix4(rotationMatrix);
    }
    if (keyControls.turnUp) {
      // 上に回転させる
      const rotationMatrix = new THREE.Matrix4().makeRotationX(0.01);
      autoMove.direction.applyMatrix4(rotationMatrix);
    }
    if (keyControls.turnDown) {
      // 下に回転させる
      const rotationMatrix = new THREE.Matrix4().makeRotationX(-0.01);
      autoMove.direction.applyMatrix4(rotationMatrix);
    }
    
    // 地球到達時は地球を常に見るように
    if (autoMove.earthReached) {
      // 地球が常に中央に見えるように調整
      camera.lookAt(earth.position);
    } else {
      // 自動回転（ゆっくりと視点が変わる）
      const rotationMatrix = new THREE.Matrix4()
        .makeRotationY(autoMove.turnRate.horizontal)
        .multiply(new THREE.Matrix4().makeRotationX(autoMove.turnRate.vertical));
      autoMove.direction.applyMatrix4(rotationMatrix);
    }
    
    // 移動を実行
    const moveX = autoMove.direction.x * currentSpeed * delta;
    const moveY = autoMove.direction.y * currentSpeed * delta;
    const moveZ = autoMove.direction.z * currentSpeed * delta;
    
    // カメラ位置の移動
    camera.position.x += moveX;
    camera.position.y += moveY;
    camera.position.z += moveZ;
    
    // 地球到達前は移動方向を向く
    if (!autoMove.earthReached) {
      // 移動方向を向くよう徐々に回転
      const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        autoMove.direction.clone().normalize()
      );
      
      // 現在の回転を取得
      const currentQuaternion = camera.quaternion.clone();
      
      // 徐々に目標の回転に近づける（補間）
      const interpolationFactor = 0.01; // 小さいほど滑らか
      currentQuaternion.slerp(targetQuaternion, interpolationFactor);
      
      // カメラの回転を更新
      camera.quaternion.copy(currentQuaternion);
    }
  }
  
  // 地球の雲を回転させる
  if (earth.clouds) {
    earth.clouds.rotation.y += 0.0001;
  }
  
  // 太陽光の位置を地球に合わせて更新（常に側面から照らす）
  const earthToSun = new THREE.Vector3(1, 0.5, 0.3).normalize();
  const earthWorldPos = new THREE.Vector3();
  earth.group.getWorldPosition(earthWorldPos);
  sunLight.position.copy(earthWorldPos.clone()).add(earthToSun.multiplyScalar(2000));
  sunLight.lookAt(earthWorldPos);
  
  // 地球までの距離情報を更新
  updateEarthDistanceInfo();
  
  // 地球到達チェック
  handleEarthReach();
  
  // 銀河もゆっくり回転（より遅く）
  galaxies.rotation.y += 0.00001;
  
  // 地球グループを少し回転させる（公転）
  earth.group.rotation.y += 0.00001;

  renderer.render(scene, camera);
}

// コンソールにメッセージを表示（動作確認用）
console.log('Auto Space Walk app has started!');
console.log('Press E key to toggle Earth guidance mode');

animate(); 