package com.expensetracker;

import com.expensetracker.model.Expense;
import com.expensetracker.model.User;
import com.expensetracker.service.ExpenseService;
import com.expensetracker.service.UserService;

import java.time.LocalDate;
import java.util.List;
import java.util.Scanner;

public class ExpenseTrackerApp {
    private static UserService userService = new UserService();
    private static ExpenseService expenseService = new ExpenseService();
    private static User loggedInUser = null;
    private static Scanner scanner = new Scanner(System.in);

    public static void main(String[] args) {
        System.out.println("Welcome to the Expense Tracker!");
        while (true) {
            if (loggedInUser == null) {
                showLoggedOutMenu();
            } else {
                showLoggedInMenu();
            }
        }
    }

    private static void showLoggedOutMenu() {
        System.out.println("\n--- Main Menu ---");
        System.out.println("1. Register");
        System.out.println("2. Login");
        System.out.println("3. Exit");
        System.out.print("Choose an option: ");
        String choice = scanner.nextLine();
        switch (choice) {
            case "1": handleRegister(); break;
            case "2": handleLogin(); break;
            case "3": System.exit(0); break;
            default: System.out.println("Invalid option.");
        }
    }

    private static void showLoggedInMenu() {
        System.out.println("\n--- User Menu (" + loggedInUser.getUsername() + ") ---");
        System.out.println("1. Add Expense");
        System.out.println("2. View Expenses");
        System.out.println("3. View Total Spending");
        System.out.println("4. Logout");
        System.out.print("Choose an option: ");
        String choice = scanner.nextLine();
        switch (choice) {
            case "1": handleAddExpense(); break;
            case "2": handleViewExpenses(); break;
            case "3": handleViewTotal(); break;
            case "4": loggedInUser = null; break;
            default: System.out.println("Invalid option.");
        }
    }

    private static void handleRegister() {
        System.out.print("Username: "); String u = scanner.nextLine();
        System.out.print("Password: "); String p = scanner.nextLine();
        if (userService.register(u, p)) System.out.println("Success!");
        else System.out.println("Failed.");
    }

    private static void handleLogin() {
        System.out.print("Username: "); String u = scanner.nextLine();
        System.out.print("Password: "); String p = scanner.nextLine();
        loggedInUser = userService.login(u, p);
        if (loggedInUser != null) System.out.println("Logged in!");
        else System.out.println("Invalid credentials.");
    }

    private static void handleAddExpense() {
        System.out.print("Description: "); String desc = scanner.nextLine();
        System.out.print("Category: "); String cat = scanner.nextLine();
        System.out.print("Amount: ");
        try {
            double amt = Double.parseDouble(scanner.nextLine());
            expenseService.addExpense(loggedInUser.getUsername(), LocalDate.now(), desc, cat, amt);
            System.out.println("Added!");
        } catch (Exception e) {
            System.out.println("Invalid amount.");
        }
    }

    private static void handleViewExpenses() {
        List<Expense> expenses = expenseService.getExpenses(loggedInUser.getUsername());
        for (Expense e : expenses) {
            System.out.println(e.getId() + " | " + e.getDate() + " | " + e.getCategory() + " | " + e.getDescription() + " | $" + e.getAmount());
        }
    }

    private static void handleViewTotal() {
        System.out.println("Total: $" + expenseService.getTotalSpending(loggedInUser.getUsername()));
    }
}
