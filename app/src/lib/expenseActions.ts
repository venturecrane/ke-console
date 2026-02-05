import type { Expense } from "@/lib/api";

export function canQuestion(expense: Expense, userId: string): boolean {
  return expense.status === "posted" && expense.created_by !== userId;
}

export function canRespond(expense: Expense, userId: string): boolean {
  return expense.status === "questioned" && expense.created_by === userId;
}

export function canSatisfy(expense: Expense, userId: string): boolean {
  return (
    expense.status === "pending_satisfaction" &&
    expense.questioned_by === userId
  );
}
