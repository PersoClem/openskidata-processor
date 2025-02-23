import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import turfCenter from "@turf/center";
import * as turf from "@turf/helpers";
import { AllGeoJSON } from "@turf/helpers";
import {
  FeatureType,
  RunDifficulty,
  RunDifficultyConvention,
  RunGrooming,
  RunUse,
  SourceType,
  Status,
} from "openskidata-format";
import { osmID } from "../features/OSMGeoJSONProperties";
import { InputRunFeature, OSMRunTags } from "../features/RunFeature";
import notEmpty from "../utils/notEmpty";
import buildFeature from "./FeatureBuilder";
import {
  FormattedInputRunFeature,
  FormattedInputRunProperties,
} from "./FormattedInputRunFeature";
import { Omit } from "./Omit";
import {
  getOSMFirstValue,
  getOSMName,
  mapOSMBoolean,
  mapOSMString,
} from "./OSMTransforms";
import getStatusAndValue from "./Status";

export function formatRun(
  feature: InputRunFeature,
): FormattedInputRunFeature | null {
  if (feature.geometry.type === "Point") {
    return null;
  }

  const tags = feature.properties.tags;

  const { status, uses } = getStatusAndUses(tags);
  if (uses.length === 0) {
    return null;
  }

  if (status !== Status.Operating) {
    return null;
  }

  const properties: Omit<FormattedInputRunProperties, "id"> = {
    type: FeatureType.Run,
    uses: uses,
    name: getOSMName(tags, "piste:name", "name"),
    ref: mapOSMString(getOrElse(tags, "piste:ref", "ref")),
    description: mapOSMString(
      getOrElse(tags, "piste:description", "description"),
    ),
    difficulty: getDifficulty(tags),
    difficultyConvention: getRunDifficultyConvention(feature),
    oneway: getOneway(tags, uses),
    gladed: getGladed(tags),
    patrolled: mapOSMBoolean(getOrElse(tags, "piste:patrolled", "patrolled")),
    lit: mapOSMBoolean(getOrElse(tags, "piste:lit", "lit")),
    grooming: getGrooming(tags),
    skiAreas: [],
    status: status,
    sources: [
      { type: SourceType.OPENSTREETMAP, id: osmID(feature.properties) },
    ],
    websites: [tags.website].filter(notEmpty),
    wikidata_id: getOSMFirstValue(tags, "wikidata"),
  };

  return buildFeature(feature.geometry, properties);
}

function getStatusAndUses(tags: OSMRunTags) {
  let { status, value: pisteType } = getStatusAndValue(
    "piste:type",
    tags as { [key: string]: string },
  );

  // Special case status check for runs: https://wiki.openstreetmap.org/wiki/Piste_Maps
  if (tags["piste:abandoned"] === "yes") {
    status = Status.Abandoned;
  }

  const uses = pisteType !== null ? getUses(pisteType) : [];
  return { status, uses };
}

function getUses(type: string): RunUse[] {
  return type
    .split(";")
    .map((t) => t.trim().toLowerCase())
    .flatMap((t) =>
      Object.values(RunUse).includes(t as RunUse) ? [t as RunUse] : [],
    );
}

function getGladed(tags: OSMRunTags): boolean | null {
  const gladedTag = mapOSMBoolean(getOrElse(tags, "piste:gladed", "gladed"));
  if (gladedTag !== null) {
    return gladedTag;
  }

  if (tags["natural"] === "wood" || tags["landuse"] === "forest") {
    return true;
  }

  return null;
}

function getOneway(tags: OSMRunTags, uses: RunUse[]): boolean | null {
  const value = mapOSMBoolean(getOrElse(tags, "piste:oneway", "oneway"));
  if (value !== null) {
    return value;
  }

  if (uses.includes(RunUse.Downhill)) {
    return true;
  }

  return null;
}

function getOrElse<P extends { [key: string]: string | undefined }>(
  properties: P,
  key: keyof P,
  fallbackKey: keyof P,
): string | undefined {
  const value = properties[key];
  if (value !== undefined) {
    return value;
  }

  const fallback = properties[fallbackKey];
  if (fallback !== undefined) {
    return fallback;
  }

  return undefined;
}

function getGrooming(tags: OSMRunTags): RunGrooming | null {
  const value = tags["piste:grooming"]?.replace(";", "+");
  if (value) {
    const values = new Set(value.split("+"));

    if (values.has(RunGrooming.Classic) && values.has(RunGrooming.Skating)) {
      return RunGrooming.ClassicAndSkating;
    }

    if (Object.values(RunGrooming).includes(value as RunGrooming)) {
      return value as RunGrooming;
    }
  }

  // Default to piste:grooming = backcountry for the most difficult runs
  if (
    tags["piste:difficulty"] === "expert" ||
    tags["piste:difficulty"] === "freeride" ||
    tags["piste:difficulty"] === "extreme"
  ) {
    return RunGrooming.Backcountry;
  }

  if (tags["piste:grooming"] === "no") {
    return RunGrooming.Backcountry;
  }

  return null;
}

function getDifficulty(tags: OSMRunTags): RunDifficulty | null {
  const value = tags["piste:difficulty"];
  return value && Object.values(RunDifficulty).includes(value as RunDifficulty)
    ? (value as RunDifficulty)
    : null;
}

const euPoly = turf.polygon([
  [
    [-20.8273687679, -38.4405631112],
    [104.0629035075, -38.4405631112],
    [104.0629035075, 79.5008734769],
    [-20.8273687679, 79.5008734769],
    [-20.8273687679, -38.4405631112],
  ],
]);
const jpPoly = turf.polygon([
  [
    [134.5454501506, 26.7303804756],
    [127.647873113, 31.9109304183],
    [141.4351555235, 45.50454598],
    [152.5506504114, 46.803648984],
    [134.5454501506, 26.7303804756],
  ],
]);

export function getRunDifficultyConvention(
  geojson: AllGeoJSON,
): RunDifficultyConvention {
  const point = turfCenter(geojson).geometry;
  if (!point) {
    throw "Cannot determine center of geometry";
  }

  if (booleanPointInPolygon(point, euPoly)) {
    return RunDifficultyConvention.EUROPE;
  } else if (booleanPointInPolygon(point, jpPoly)) {
    return RunDifficultyConvention.JAPAN;
  } else {
    return RunDifficultyConvention.NORTH_AMERICA;
  }
}
