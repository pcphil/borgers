import type { ReactNode } from 'react'
import type { ObjectDefId } from '../data/catalogue'
import { Kenney } from './kenney'

// Kenney-model versions of objects, in the same local space as MODELS (front = -z).
// Objects without a fitting Kenney model keep their primitive version.

const F = 'furniture/'
const COUNTER_H = 0.9

const Chair = ({ x, z, face }: { x: number; z: number; face: 'n' | 's' | 'e' | 'w' }) => {
  const rotY = { n: 0, s: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[face]
  return <Kenney path={`${F}chair.glb`} h={0.95} rotY={rotY} position={[x, 0, z]} />
}

export const KENNEY_MODELS: Partial<Record<ObjectDefId, () => ReactNode>> = {
  grill: () => (
    <>
      <Kenney path={`${F}kitchenStove.glb`} h={COUNTER_H} position={[-0.5, 0, 0]} />
      <Kenney path={`${F}kitchenStove.glb`} h={COUNTER_H} position={[0.5, 0, 0]} />
    </>
  ),
  fryer: () => <Kenney path={`${F}kitchenStoveElectric.glb`} h={COUNTER_H} />,
  assembly: () => (
    <>
      <Kenney path={`${F}kitchenCabinet.glb`} h={COUNTER_H} position={[-0.5, 0, 0]} />
      <Kenney path={`${F}kitchenCabinet.glb`} h={COUNTER_H} position={[0.5, 0, 0]} />
    </>
  ),
  soda: () => (
    <>
      <Kenney path={`${F}kitchenCabinet.glb`} h={COUNTER_H} />
      <Kenney path={`${F}kitchenCoffeeMachine.glb`} w={0.6} position={[0, COUNTER_H, 0.1]} />
    </>
  ),
  fridge: () => <Kenney path={`${F}kitchenFridge.glb`} h={1.9} />,
  table2: () => (
    <>
      <Kenney path={`${F}table.glb`} w={1.1} d={0.7} h={0.75} stretch />
      <Chair x={-0.75} z={0} face="e" />
      <Chair x={0.75} z={0} face="w" />
    </>
  ),
  table4: () => (
    <>
      <Kenney path={`${F}table.glb`} w={1.3} d={1.0} h={0.75} stretch />
      <Chair x={-0.4} z={-0.75} face="n" />
      <Chair x={0.4} z={-0.75} face="n" />
      <Chair x={-0.4} z={0.75} face="s" />
      <Chair x={0.4} z={0.75} face="s" />
    </>
  ),
  bin: () => <Kenney path={`${F}trashcan.glb`} h={0.8} />,
  plant: () => <Kenney path={`${F}pottedPlant.glb`} h={1.1} />,
  lamp: () => <Kenney path={`${F}lampRoundFloor.glb`} h={1.7} />,
}

/** Food shown in busy station slots and on pickup counters. */
export const FOOD_MODEL: Record<string, { path: string; w: number }> = {
  grill: { path: 'food/meat-patty.glb', w: 0.28 },
  fryer: { path: 'food/fries.glb', w: 0.25 },
  assembly: { path: 'food/burger.glb', w: 0.3 },
  soda: { path: 'food/soda-glass.glb', w: 0.16 },
  pickup: { path: 'food/bag.glb', w: 0.26 },
}
