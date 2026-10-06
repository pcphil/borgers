# Third-party assets

All bundled art and audio are by [Kenney](https://www.kenney.nl) under
[CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) (public domain). Credit is not
required but is given here with thanks. Each pack's original `License.txt` sits next to its files.

| Pack | Version / source | Files used | Location |
| --- | --- | --- | --- |
| Furniture Kit | kenney.nl/assets/furniture-kit | kitchenStove, kitchenStoveElectric, kitchenCabinet, kitchenCoffeeMachine, kitchenFridge, kitchenBar, table, chair, trashcan, pottedPlant, lampRoundFloor | `public/assets/models/furniture/` |
| Food Kit (2.0) | kenney.nl/assets/food-kit | meat-patty, fries, burger, soda-glass, bag (+ `Textures/colormap.png`) | `public/assets/models/food/` |
| Mini Characters | kenney.nl/assets/mini-characters | character-female-a…d, character-male-a…d (+ `Textures/colormap.png`) | `public/assets/models/characters/` |
| Interface Sounds | kenney.nl/assets/interface-sounds | bong_001 → `enter`, confirmation_001 → `order`, drop_002 → `cook`, drop_001 → `place`, confirmation_004 → `star` | `public/assets/sfx/` |
| Impact Sounds | kenney.nl/assets/impact-sounds | impactBell_heavy_000 → `ready` | `public/assets/sfx/` |

Notes:

- Models are used as shipped (GLB, ~2.3 MB total). They are small enough that meshopt/draco
  compression was not worth adding a build step for.
- Characters are skinned in the source files. The game bakes the first frame of the `idle` and `sit`
  clips into static geometry at load time and draws them instanced.
- Register and pickup counter use the game's own primitive models (no matching Kenney model).
