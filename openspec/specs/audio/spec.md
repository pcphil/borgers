# audio Specification

## Purpose

Defines the game's sound: short sound effects tied to simulation events, and the volume control that governs them.

## Requirements

### Requirement: Event sound effects
The game SHALL play sound effects for key events: customer entering, order taken (register), food cooking on a grill or fryer, order ready at pickup, purchase/placement, and star gained. Sounds SHALL respect game speed (not play while paused) and SHALL be rate-limited so busy moments do not produce a wall of noise.

#### Scenario: Order ready
- **WHEN** an order is placed on the pickup counter
- **THEN** a ready sound plays

#### Scenario: Paused
- **WHEN** the game is paused
- **THEN** no simulation sound effects play

### Requirement: Volume control
Master volume SHALL be adjustable from 0 to 100% in settings, with 0 muting all audio. Audio SHALL NOT start until the player has interacted with the page.

#### Scenario: Mute
- **WHEN** the player sets volume to 0
- **THEN** no sound plays
