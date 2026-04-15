package com.expensetracker.service;

import com.expensetracker.model.Expense;

import java.io.*;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class ExpenseService {
    private static final String FILE_NAME = "expenses.txt";
    private List<Expense> expenses;
    private int nextId;

    public ExpenseService() {
        expenses = loadExpenses();
        nextId = expenses.stream().mapToInt(Expense::getId).max().orElse(0) + 1;
    }

    public void addExpense(String username, LocalDate date, String description, String category, double amount) {
        Expense expense = new Expense(nextId++, username, date, description, category, amount);
        expenses.add(expense);
        saveExpenses();
    }

    public void deleteExpense(int id) {
        expenses.removeIf(e -> e.getId() == id);
        saveExpenses();
    }

    public List<Expense> getExpenses(String username) {
        return expenses.stream()
                .filter(e -> e.getUsername().equals(username))
                .collect(Collectors.toList());
    }

    public double getTotalSpending(String username) {
        return getExpenses(username).stream()
                .mapToDouble(Expense::getAmount)
                .sum();
    }

    private void saveExpenses() {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(FILE_NAME))) {
            for (Expense expense : expenses) {
                writer.write(expense.toString());
                writer.newLine();
            }
        } catch (IOException e) {
            System.err.println("Error saving expenses: " + e.getMessage());
        }
    }

    private List<Expense> loadExpenses() {
        List<Expense> loadedExpenses = new ArrayList<>();
        File file = new File(FILE_NAME);
        if (!file.exists()) {
            return loadedExpenses;
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",");
                if (parts.length == 5) { // Backwards compatibility
                    int id = Integer.parseInt(parts[0]);
                    String username = parts[1];
                    LocalDate date = LocalDate.parse(parts[2]);
                    String description = parts[3];
                    String category = "Other";
                    double amount = Double.parseDouble(parts[4]);
                    loadedExpenses.add(new Expense(id, username, date, description, category, amount));
                } else if (parts.length >= 6) {
                    int id = Integer.parseInt(parts[0]);
                    String username = parts[1];
                    LocalDate date = LocalDate.parse(parts[2]);
                    String description = parts[3];
                    String category = parts[4];
                    double amount = Double.parseDouble(parts[5]);
                    loadedExpenses.add(new Expense(id, username, date, description, category, amount));
                }
            }
        } catch (IOException | NumberFormatException | DateTimeParseException e) {
            System.err.println("Error loading expenses: " + e.getMessage());
        }
        return loadedExpenses;
    }
}
