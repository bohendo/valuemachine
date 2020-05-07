import {
  LogTypes,
} from "@finances/types";

const INDENT = 5;

export const inTypes = [
  LogTypes.Borrow,
  LogTypes.GiftIn,
  LogTypes.Income,
  LogTypes.Mint,
  LogTypes.SwapIn,
  LogTypes.Withdraw,
];

export const outTypes = [
  LogTypes.Burn,
  LogTypes.Deposit,
  LogTypes.Expense,
  LogTypes.GiftOut,
  LogTypes.Repay,
  LogTypes.SwapOut,
];

export const getCoordinates = (startAngle: number, endAngle: number, maxRadius: number) => {
  const angle = startAngle + (endAngle - startAngle) / 2;
  return {
    x: (maxRadius + INDENT) * Math.sin(angle),
    y: (maxRadius + INDENT) * Math.cos(angle)
  };
};
