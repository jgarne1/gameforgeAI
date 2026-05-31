# Whisperwind Prefab System

This folder contains the first prefab workflow for building GameForge RPG towns.

## Purpose

Do not build towns by placing hundreds of individual assets. Use prefabs to stamp meaningful chunks first, then polish individual objects with the Asset Brush Editor.

## Included Prefabs

- `south_gate_arrival` — first arrival/spawn approach.
- `road_segment_garden` — reusable road connector.
- `flower_cluster_meadow` — small detail cluster.
- `fountain_plaza_core` — town-center gathering space.
- `echo_hall_exterior` — first-pass social landmark exterior.
- `cottage_lot_basic` — ready-made empty house/cottage lot.
- `market_corner_basic` — starter market/shop corner.

## Workflow

1. Open Admin → World Tools → Asset Brush Editor.
2. Choose **Place Prefab**.
3. Select a prefab from the Prefab Palette.
4. Stamp South Gate, Fountain Plaza, and Echo Hall first.
5. Switch to Select/Move and polish individual objects.
6. Download the scene JSON and replace the matching scene file.

## Design Rule

Prefabs are not final maps. They are composition starters. They should be used to establish structure quickly, not replace human polishing.
