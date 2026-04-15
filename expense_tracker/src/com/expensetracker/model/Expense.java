package com.expensetracker.model;

import java.io.Serializable;
import java.time.LocalDate;

public class Expense implements Serializable {
    private int id;
    private String username;
    private LocalDate date;
    private String description;
    private String category;
    private double amount;

    public Expense(int id, String username, LocalDate date, String description, String category, double amount) {
        this.id = id;
        this.username = username;
        this.date = date;
        this.description = description;
        this.category = category;
        this.amount = amount;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    @Override
    public String toString() {
        return id + "," + username + "," + date.toString() + "," + description + "," + category + "," + amount;
    }
}
