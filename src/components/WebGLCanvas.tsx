import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mockEncrypt, mockDecrypt } from '../utils/mockCrypto';

const MAX_TEXTURE_SIZE = 2048;
const MAX_TOTAL_BUFFER_BYTES = 32 * 1024 * 1024;

const CARD_THICKNESS = 0.08;
const GAP = 0.3; // visual gap between cards
const GRID_FILL = 0.94; // leave some breathing room around grid
const GRID_MARGIN = 0.03;
const CARD_PADDING = 0.07;

const CORNER_RADIUS_REL = 0.08;
const BORDER_COLOR = 0xd2d9e6;
const BORDER_OPACITY = 0.85;

export type SkinCard = {
  name: string;
  description: string;
  iconUrl: string;
  gameLabel?: string;
  isMock?: boolean;
  mockIndex?: number;
};

const TEST_INVENTORY: SkinCard[] = [
  { name: 'Skin #1', description: 'Mock skin', iconUrl: '/assets/test-skin.png', gameLabel: 'CS2' },
  { name: 'Skin #2', description: 'Mock skin', iconUrl: '/assets/test-skin.png', gameLabel: 'CS2' },
  { name: 'Skin #3', description: 'Mock skin', iconUrl: '/assets/test-skin.png', gameLabel: 'Rust' },
  { name: 'Skin #4', description: 'Mock skin', iconUrl: '/assets/test-skin.png', gameLabel: 'Rust' },
  { name: 'Skin #5', description: 'Mock skin', iconUrl: '/assets/test-skin.png', gameLabel: 'Dota 2' },
  { name: 'Skin #6', description: 'Mock skin', iconUrl: '/assets/test-skin.png', gameLabel: 'Dota 2' },
  { name: 'Skin #7', description: 'Mock skin', iconUrl: '/assets/test-skin.png', gameLabel: 'TF2' },
  { name: 'Skin #8', description: 'Mock skin', iconUrl: '/assets/test-skin.png', gameLabel: 'TF2' }
];

type Props = {
  skins?: SkinCard[];
  onSkinSelect?: (skin: SkinCard) => void;
};

export const WebGLCanvas: React.FC<Props> = ({ skins = [], onSkinSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const totalBufferBytesRef = useRef(0);
  const [hoverLabel, setHoverLabel] = useState<{ name: string; x: number; y: number } | null>(null);
  const [decryptedGallery, setDecryptedGallery] = useState<SkinCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await mockEncrypt(JSON.stringify(TEST_INVENTORY));
        const decrypted = await mockDecrypt(payload);
        const parsed = JSON.parse(decrypted) as SkinCard[];
        if (!cancelled) setDecryptedGallery(parsed);
      } catch {
        if (!cancelled) setDecryptedGallery([...TEST_INVENTORY]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const baseItems = skins.length > 0 ? skins : (decryptedGallery ?? TEST_INVENTORY);
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || baseItems.length === 0) return;

    // Always render up to 8 cards per game for the gallery.
    const maxCards = 8;
    const sourceCount = Math.min(baseItems.length, maxCards);
    const items: SkinCard[] = [];
    for (let i = 0; i < maxCards; i += 1) {
      const src = baseItems[i % sourceCount];
      items.push({
        ...src,
        name: `${src.name} #${i + 1}`
      });
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    const scene = new THREE.Scene();
    // Slightly darker than the parent canvas-shell background so cards stand out
    scene.background = new THREE.Color('#020314');
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const cardMeshes: THREE.Mesh[] = [];
    const cardTargetScale = new Map<THREE.Mesh, number>();
    const cardTargetQuat = new Map<THREE.Mesh, THREE.Quaternion>();
    const tempQuat = new THREE.Quaternion();
    const tempVec = new THREE.Vector3();
    const hoverVec = new THREE.Vector3();

    type CardEntry = {
      mesh: THREE.Mesh;
      border: THREE.LineSegments;
      texture: THREE.Texture;
      skin: SkinCard;
    };
    const cards: CardEntry[] = [];

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (animationId !== null) cancelAnimationFrame(animationId);
    };

    const handleContextRestored = () => {
      init();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    const allocateBuffer = (byteLength: number) => {
      const nextTotal = totalBufferBytesRef.current + byteLength;
      if (nextTotal > MAX_TOTAL_BUFFER_BYTES) throw new Error('GPU memory limit exceeded');
      totalBufferBytesRef.current = nextTotal;
    };

    const updateMouse = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (event: MouseEvent) => {
      updateMouse(event);
      if (!camera) return;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cardMeshes);
      cardMeshes.forEach((mesh) => {
        cardTargetScale.set(mesh, 1);
        cardTargetQuat.set(mesh, (mesh as THREE.Mesh).quaternion.clone());
      });
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const skin = (mesh.userData as { skin?: SkinCard }).skin;
        cardTargetScale.set(mesh, 1.1);
        // Gentle tilt toward cursor (avoid extreme rotations).
        tempVec.set(mouse.x * 0.35, mouse.y * 0.35, 0.9).unproject(camera);
        tempVec.sub(camera.position).normalize();
        tempQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tempVec);
        cardTargetQuat.set(mesh, tempQuat.clone());
        if (skin) {
          const rect = canvas.getBoundingClientRect();
          const topOffset = (mesh.userData as { cardHeight?: number }).cardHeight ?? 1.6;
          const v = new THREE.Vector3(0, topOffset * 0.5, 0).applyMatrix4(mesh.matrixWorld).project(camera);
          setHoverLabel({
            name: skin.name,
            x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
            y: rect.top + (-v.y * 0.5 + 0.5) * rect.height
          });
        }
      } else {
        setHoverLabel(null);
      }
    };

    const handlePointerLeave = () => {
      setHoverLabel(null);
      cardMeshes.forEach((m) => {
        cardTargetScale.set(m, 1);
        cardTargetQuat.set(m, (m as THREE.Mesh).quaternion.clone());
      });
    };

    const handleClick = (event: MouseEvent) => {
      updateMouse(event);
      if (!camera) return;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cardMeshes);
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const skin = (mesh.userData as { skin?: SkinCard }).skin;
        if (skin && onSkinSelect) onSkinSelect(skin);
      }
    };

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const getColumns = (w: number) => {
      // responsive layout:
      // < 350px: 1 column
      // 350–599px: 2 columns
      // >= 600px: 3 columns
      if (w < 350) return 1;
      if (w < 600) return 2;
      return 3;
    };

    const getCanvasSize = () => {
      const w = Math.max(260, container.clientWidth || 320);
      const cols = getColumns(w);
      let h: number;
      if (cols === 1) {
        // One narrow column: make canvas tall enough to fit all 8 cards
        h = Math.max(900, w * 5);
      } else if (cols === 2) {
        // Two columns: medium height
        h = Math.max(520, Math.min(900, w * 1.6));
      } else {
        // Three columns on larger screens
        h = Math.max(420, Math.min(800, w * 1.1));
      }
      return { w, h };
    };

    const computeLayout = (w: number, h: number, count: number) => {
      const cols = getColumns(w);
      const rows = Math.ceil(count / cols);

      const camDist = 4.9; // closer camera -> bigger cards
      const vFov = (46 * Math.PI) / 180;
      const visibleHeight = 2 * camDist * Math.tan(vFov / 2);
      const visibleWidth = visibleHeight * (w / h);

      const usableW = visibleWidth * (1 - 2 * GRID_MARGIN) * GRID_FILL;
      const usableH = visibleHeight * (1 - 2 * GRID_MARGIN) * GRID_FILL;

      const cardWidth = (usableW - (cols - 1) * GAP) / cols;
      const cardHeight = (usableH - (rows - 1) * GAP) / rows;

      const totalW = cols * cardWidth + (cols - 1) * GAP;
      const totalH = rows * cardHeight + (rows - 1) * GAP;
      const startX = -totalW / 2 + cardWidth / 2 + GAP / 2;
      const startY = totalH / 2 - cardHeight / 2 - GAP / 2;

      return { cols, rows, cardWidth, cardHeight, startX, startY, camDist, vFov };
    };

    const reflow = () => {
      if (!renderer || !camera) return;
      const { w, h } = getCanvasSize();
      renderer.setSize(w, h, false);
      camera.aspect = w / h;

      const layout = computeLayout(w, h, cards.length);
      camera.fov = (layout.vFov * 180) / Math.PI;
      camera.position.set(0, 0, layout.camDist);
      camera.updateProjectionMatrix();

      const radius = Math.min(layout.cardWidth, layout.cardHeight) * CORNER_RADIUS_REL;
      cards.forEach((entry, i) => {
        const col = i % layout.cols;
        const row = Math.floor(i / layout.cols);
        const x = layout.startX + col * (layout.cardWidth + GAP);
        const y = layout.startY - row * (layout.cardHeight + GAP);

        // update position
        entry.mesh.position.set(x, y, 0);

        // update geometry (so rounded corners stay correct at all sizes)
        const newGeo = new RoundedBoxGeometry(
          layout.cardWidth,
          layout.cardHeight,
          CARD_THICKNESS,
          3,
          radius
        );
        entry.mesh.geometry.dispose();
        entry.mesh.geometry = newGeo;
        entry.mesh.userData.cardHeight = layout.cardHeight;

        // update border geometry to match
        const edges = new THREE.EdgesGeometry(newGeo, 28);
        entry.border.geometry.dispose();
        entry.border.geometry = edges;
      });
    };

    const onResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        reflow();
      }, 60);
    };

    const init = () => {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const { w, h } = getCanvasSize();
      renderer.setSize(w, h);

      camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
      camera.position.set(0, 0, 4.9);

      allocateBuffer(2 * 1024 * 1024);

      const ambient = new THREE.AmbientLight(0x404060, 0.6);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 1.3);
      dir.position.set(5, 7, 6);
      scene.add(dir);

      const loader = new THREE.TextureLoader();
      const maxItems = Math.min(items.length, 8);
      const displayItems = items.slice(0, maxItems);

      displayItems.forEach((skin, i) => {
        const iconUrl = skin.iconUrl.startsWith('http') ? skin.iconUrl : skin.iconUrl;
        loader.load(
          iconUrl,
          (texture: THREE.Texture) => {
            texture.anisotropy = renderer ? Math.min(4, renderer.capabilities.getMaxAnisotropy()) : 4;
            if (texture.image && 'width' in texture.image && texture.image.width > MAX_TEXTURE_SIZE) {
              texture.image.width = MAX_TEXTURE_SIZE;
            }

            // Create initial geometry; it will be resized by reflow().
            const geometry = new RoundedBoxGeometry(1, 1, CARD_THICKNESS, 5, 0.12);
            const material = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.2,
              metalness: 0.5,
              transparent: true
            });
            const card = new THREE.Mesh(geometry, material);
            card.userData.skin = skin;
            cardMeshes.push(card);
            cardTargetScale.set(card, 1);
            cardTargetQuat.set(card, card.quaternion.clone());
            scene.add(card);

            const edges = new THREE.EdgesGeometry(geometry, 28);
            const line = new THREE.LineSegments(
              edges,
              new THREE.LineBasicMaterial({ color: BORDER_COLOR, transparent: true, opacity: BORDER_OPACITY })
            );
            card.add(line);

            // Crop texture to create padding.
            texture.repeat.set(1 - CARD_PADDING * 2, 1 - CARD_PADDING * 2);
            texture.offset.set(CARD_PADDING, CARD_PADDING);

            cards.push({ mesh: card, border: line, texture, skin });
            // Reflow once we have some cards (safe to call multiple times)
            reflow();
          },
          undefined,
          () => {}
        );
      });

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const t = 0.12;
        cardMeshes.forEach((mesh) => {
          const targetS = cardTargetScale.get(mesh) ?? 1;
          mesh.scale.lerp(new THREE.Vector3(targetS, targetS, targetS), t);
          const targetQ = cardTargetQuat.get(mesh);
          if (targetQ) mesh.quaternion.slerp(targetQ, t);
        });
        renderer?.render(scene, camera as THREE.Camera);
      };

      animate();
    };

    try {
      init();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', onResize);
      }
      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerleave', handlePointerLeave);
      canvas.addEventListener('pointerdown', handleClick);
    } catch {
      // swallow GPU limit errors
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize);
      }
      if (resizeTimeout) clearTimeout(resizeTimeout);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointerdown', handleClick);
      if (animationId !== null) cancelAnimationFrame(animationId);
      cardMeshes.forEach((m) => {
        if (Array.isArray(m.material)) m.material.forEach((mat: THREE.Material) => mat.dispose());
        else if (m.material && 'dispose' in m.material) (m.material as THREE.Material).dispose();
        if (m.geometry) m.geometry.dispose();
        m.children.forEach((child: THREE.Object3D) => {
          if (child instanceof THREE.LineSegments) {
            child.geometry?.dispose();
            (child.material as THREE.Material)?.dispose();
          }
        });
      });
      if (renderer) renderer.dispose();
    };
  }, [skins, decryptedGallery, onSkinSelect]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minHeight: 320 }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: 'auto', minHeight: 280, borderRadius: 12, background: '#020617' }}
      />
      {hoverLabel && (
        <div
          style={{
            position: 'fixed',
            left: hoverLabel.x,
            top: hoverLabel.y,
            transform: 'translate(-50%, -100%) translateY(-8px)',
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.6)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#e5e7eb',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 10
          }}
        >
          {hoverLabel.name}
        </div>
      )}
    </div>
  );
}
