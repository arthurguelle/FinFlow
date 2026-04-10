import { Routes } from "@angular/router";
import { authGuard, guestGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  { path: "", redirectTo: "dashboard", pathMatch: "full" },
  {
    path: "login",
    loadComponent: () => import("./features/auth/login/login.component").then(m => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: "dashboard",
    loadComponent: () => import("./features/dashboard/dashboard.component").then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: "expenses",
    loadComponent: () => import("./features/expenses/expenses.component").then(m => m.ExpensesComponent),
    canActivate: [authGuard],
  },
  {
    path: "movements",
    loadComponent: () => import("./features/movements/movements.component").then(m => m.MovementsComponent),
    canActivate: [authGuard],
  },
  { path: "**", redirectTo: "dashboard" },
];
