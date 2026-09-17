import { Composition } from "remotion";
import {
  WAYPOINT_DRAW_DURATION,
  WAYPOINT_DRAW_FPS,
  WAYPOINT_DRAW_SIZE,
  WaypointDraw,
} from "./WaypointDraw";
import {
  LANDING_STAGE_DURATION,
  LANDING_STAGE_FPS,
  LANDING_STAGE_HEIGHT,
  LANDING_STAGE_WIDTH,
  LandingStage,
} from "./LandingStage";
import {
  YELLOW_FIELD_DURATION,
  YELLOW_FIELD_FPS,
  YELLOW_FIELD_HEIGHT,
  YELLOW_FIELD_WIDTH,
  YellowField,
} from "./YellowField";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="YellowField"
        component={YellowField}
        durationInFrames={YELLOW_FIELD_DURATION}
        fps={YELLOW_FIELD_FPS}
        width={YELLOW_FIELD_WIDTH}
        height={YELLOW_FIELD_HEIGHT}
      />
      <Composition
        id="LandingStage"
        component={LandingStage}
        durationInFrames={LANDING_STAGE_DURATION}
        fps={LANDING_STAGE_FPS}
        width={LANDING_STAGE_WIDTH}
        height={LANDING_STAGE_HEIGHT}
      />
      <Composition
        id="WaypointDraw"
        component={WaypointDraw}
        durationInFrames={WAYPOINT_DRAW_DURATION}
        fps={WAYPOINT_DRAW_FPS}
        width={WAYPOINT_DRAW_SIZE}
        height={WAYPOINT_DRAW_SIZE}
        defaultProps={{ color: "#111111" }}
      />
    </>
  );
}
