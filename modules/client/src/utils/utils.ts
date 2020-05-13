import {
  EventTypes,
} from "@finances/types";

const INDENT = 5;

export const inTypes = [
  EventTypes.Borrow,
  EventTypes.GiftIn,
  EventTypes.Income,
  EventTypes.Mint,
  EventTypes.SwapIn,
];

export const outTypes = [
  EventTypes.Burn,
  EventTypes.Expense,
  EventTypes.GiftOut,
  EventTypes.Repay,
  EventTypes.SwapOut,
];

export const getCoordinates = (startAngle: number, endAngle: number, maxRadius: number) => {
  const angle = startAngle + (endAngle - startAngle) / 2;
  return {
    x: (maxRadius + INDENT) * Math.sin(angle),
    y: (maxRadius + INDENT) * Math.cos(angle)
  };
};
