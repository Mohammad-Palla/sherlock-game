import { SceneId } from '../types';

export const SCENE_LABELS: Record<SceneId, string> = {
  BOOT: 'Case File',
  CRIME_SCENE: 'Crime Scene',
  STUDY: 'Baker Street Study',
  LAIR: "Moriarty's Lair",
  STUDY_NOIR: 'Case Study Noir',
  STREET_BAIT: 'Cathedral Street',
  UNDERPASS: 'Riverside Underpass',
};

export const SCENE_TAGLINES: Record<SceneId, string> = {
  BOOT: 'Awaiting the briefing',
  CRIME_SCENE: 'Sherlock on the trail',
  STUDY: "Watson's analysis",
  LAIR: 'Moriarty sets the snare',
  STUDY_NOIR: 'A ticking case in a dim room',
  STREET_BAIT: 'A false bell in the fog',
  UNDERPASS: 'Flashlight sweep in the damp',
};

export const formatSceneLabel = (scene: SceneId) => SCENE_LABELS[scene] ?? scene;
