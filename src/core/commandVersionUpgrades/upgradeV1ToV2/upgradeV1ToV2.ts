import { flow } from "lodash";
import {
  Modifier,
  PartialPrimitiveTarget,
  PartialRangeTarget,
  PartialTarget,
  ScopeType,
} from "../../../typings/target.types";
import { ActionType } from "../../../typings/Types";
import { transformPartialPrimitiveTargets } from "../../../util/getPrimitiveTargets";
import { CommandV2 } from "../../commandRunner/command.types";
import {
  CommandV1,
  ModifierV0V1,
  PartialPrimitiveTargetV0V1,
  PartialTargetV0V1,
} from "./commandV1.types";
import { upgradeStrictHere } from "./upgradeStrictHere";

export function upgradeV1ToV2(command: CommandV1): CommandV2 {
  return {
    spokenForm: command.spokenForm,
    action: command.action as ActionType,
    targets: upgradeTargets(command.targets),
    extraArgs: command.extraArgs,
    usePrePhraseSnapshot: command.usePrePhraseSnapshot ?? false,
    version: 2,
  };
}

function upgradeModifier(modifier: ModifierV0V1): Modifier | null {
  switch (modifier.type) {
    case "identity":
      return null;
    case "containingScope":
      const mod = {
        ...modifier,
        scopeType: modifier.scopeType as ScopeType,
      };
      if (modifier.includeSiblings) {
        return {
          ...mod,
          type: "everyScope",
        };
      }
      return mod;
    default:
      return modifier;
  }
}

function upgradePrimitiveTarget(
  target: PartialPrimitiveTargetV0V1
): PartialPrimitiveTarget {
  const {
    insideOutsideType,
    modifier,
    isImplicit,
    selectionType,
    position,
    ...rest
  } = target;
  const modifiers: Modifier[] = [];
  if (modifier) {
    const mod = upgradeModifier(modifier);
    if (mod) {
      modifiers.push(mod);
    }
  }
  if (isImplicit) {
    modifiers.push({ type: "toRawSelection" });
  }
  if (selectionType) {
    modifiers.push({ type: "containingScope", scopeType: selectionType });
  }
  if (position && position !== "contents") {
    modifiers.push({ type: "position", position: position });
  }
  // Modifiers are processed backwards
  modifiers.reverse();
  return {
    ...rest,
    modifiers,
  };
}

function upgradeTarget(target: PartialTargetV0V1): PartialTarget {
  switch (target.type) {
    case "list":
      return {
        ...target,
        elements: target.elements.map(
          (target) =>
            upgradeTarget(target) as PartialPrimitiveTarget | PartialRangeTarget
        ),
      };
    case "range":
      return {
        ...target,
        anchor: upgradePrimitiveTarget(target.start),
        active: upgradePrimitiveTarget(target.end),
      };
    case "primitive":
      return upgradePrimitiveTarget(target);
  }
}

function upgradeTargets(partialTargets: PartialTargetV0V1[]) {
  const partialTargetsV2: PartialTarget[] = partialTargets.map(upgradeTarget);
  return transformPartialPrimitiveTargets(
    partialTargetsV2,
    flow(upgradeStrictHere)
  );
}
