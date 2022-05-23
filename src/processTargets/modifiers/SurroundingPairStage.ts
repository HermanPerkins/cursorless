import { SurroundingPairModifier, Target } from "../../typings/target.types";
import { ProcessedTargetsContext } from "../../typings/Types";
import { selectionWithEditorWithContextToTarget } from "../../util/targetUtils";
import { ModifierStage } from "../PipelineStages.types";
import SurroundingPairTarget from "../targets/SurroundingPairTarget";
import { processSurroundingPair } from "./surroundingPair";

/**
 * Applies the surrounding pair modifier to the given selection. First looks to
 * see if the target is itself adjacent to or contained by a modifier token. If
 * so it will expand the selection to the opposite delimiter token. Otherwise,
 * or if the opposite token wasn't found, it will proceed by finding the
 * smallest pair of delimiters which contains the selection.
 *
 * @param context Context to be leveraged by modifier
 * @param selection The selection to process
 * @param modifier The surrounding pair modifier information
 * @returns The new selection expanded to the containing surrounding pair or
 * `null` if none was found
 */
export default class implements ModifierStage {
  constructor(private modifier: SurroundingPairModifier) {}

  run(
    context: ProcessedTargetsContext,
    target: Target
  ): SurroundingPairTarget[] {
    return processedSurroundingPairTarget(this.modifier, context, target);
  }
}

function processedSurroundingPairTarget(
  modifier: SurroundingPairModifier,
  context: ProcessedTargetsContext,
  target: Target
): SurroundingPairTarget[] {
  const pairs = processSurroundingPair(
    context,
    target.editor,
    target.contentRange,
    modifier
  );

  if (pairs == null) {
    throw new Error("Couldn't find containing pair");
  }

  return pairs.map(
    (pair) =>
      new SurroundingPairTarget({
        ...selectionWithEditorWithContextToTarget(pair),
        isReversed: target.isReversed,
      })
  );
}
