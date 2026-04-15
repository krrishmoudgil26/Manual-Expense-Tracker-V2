package com.expensetracker;

import com.expensetracker.model.Expense;
import com.expensetracker.model.User;
import com.expensetracker.service.ExpenseService;
import com.expensetracker.service.UserService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.List;

public class WebServerApp {
    private static UserService userService = new UserService();
    private static ExpenseService expenseService = new ExpenseService();

    public static void main(String[] args) throws IOException {
        int port = 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/", new StaticFileHandler("web/index.html", "text/html"));
        server.createContext("/style.css", new StaticFileHandler("web/style.css", "text/css"));
        server.createContext("/app.js", new StaticFileHandler("web/app.js", "application/javascript"));
        server.createContext("/finance_illustration.png", new StaticFileHandler("web/finance_illustration.png", "image/png"));

        server.createContext("/api/auth/register", new RegisterHandler());
        server.createContext("/api/auth/login", new LoginHandler());
        server.createContext("/api/expenses", new ExpensesHandler());
        server.createContext("/api/expenses/delete", new DeleteExpenseHandler());

        server.setExecutor(null);
        server.start();
        System.out.println("Web Server is running gracefully on http://localhost:" + port);
    }

    static class StaticFileHandler implements HttpHandler {
        private String filePath;
        private String contentType;

        public StaticFileHandler(String filePath, String contentType) {
            this.filePath = filePath;
            this.contentType = contentType;
        }

        @Override
        public void handle(HttpExchange t) throws IOException {
            File file = new File(filePath);
            if (!file.exists()) {
                String response = "404 (Not Found)\n";
                t.sendResponseHeaders(404, response.length());
                OutputStream os = t.getResponseBody();
                os.write(response.getBytes());
                os.close();
                return;
            }

            t.getResponseHeaders().set("Content-Type", contentType);
            t.sendResponseHeaders(200, file.length());
            OutputStream os = t.getResponseBody();
            Files.copy(file.toPath(), os);
            os.close();
        }
    }

    static class RegisterHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            if ("POST".equals(t.getRequestMethod())) {
                String body = getBody(t);
                String username = extractJsonString(body, "username");
                String password = extractJsonString(body, "password");

                String response;
                if (username != null && password != null && userService.register(username, password)) {
                    response = "{\"success\":true}";
                } else {
                    response = "{\"success\":false, \"message\":\"Username exists or invalid input\"}";
                }
                sendJsonResponse(t, response);
            }
        }
    }

    static class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            if ("POST".equals(t.getRequestMethod())) {
                String body = getBody(t);
                String username = extractJsonString(body, "username");
                String password = extractJsonString(body, "password");

                User user = userService.login(username, password);
                String response;
                if (user != null) {
                    response = "{\"success\":true}";
                } else {
                    response = "{\"success\":false, \"message\":\"Invalid credentials\"}";
                }
                sendJsonResponse(t, response);
            }
        }
    }

    static class ExpensesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            if ("GET".equals(t.getRequestMethod())) {
                String query = t.getRequestURI().getQuery();
                String username = "";
                if (query != null && query.startsWith("username=")) {
                    username = query.split("=")[1];
                }

                List<Expense> list = expenseService.getExpenses(username);
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < list.size(); i++) {
                    Expense e = list.get(i);
                    sb.append(String.format("{\"id\":%d, \"date\":\"%s\", \"description\":\"%s\", \"category\":\"%s\", \"amount\":%s}",
                            e.getId(), e.getDate().toString(), e.getDescription().replace("\"", "\\\""), e.getCategory(), e.getAmount()));
                    if (i < list.size() - 1) sb.append(",");
                }
                sb.append("]");
                sendJsonResponse(t, sb.toString());
                
            } else if ("POST".equals(t.getRequestMethod())) {
                String body = getBody(t);
                String username = extractJsonString(body, "username");
                String description = extractJsonString(body, "description");
                String category = extractJsonString(body, "category");
                String dateStr = extractJsonString(body, "date");
                String amountStr = extractJsonNumber(body, "amount");

                String response;
                try {
                    if (username != null && description != null && amountStr != null && category != null && dateStr != null) {
                        double amount = Double.parseDouble(amountStr);
                        LocalDate date = LocalDate.parse(dateStr);
                        expenseService.addExpense(username, date, description, category, amount);
                        response = "{\"success\":true}";
                    } else {
                        response = "{\"success\":false}";
                    }
                } catch(Exception e) {
                    response = "{\"success\":false}";
                }
                sendJsonResponse(t, response);
            }
        }
    }

    static class DeleteExpenseHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            if ("POST".equals(t.getRequestMethod())) {
                String body = getBody(t);
                String idStr = extractJsonNumber(body, "id");
                
                String response;
                try {
                    if (idStr != null) {
                        int id = Integer.parseInt(idStr);
                        expenseService.deleteExpense(id);
                        response = "{\"success\":true}";
                    } else {
                        response = "{\"success\":false}";
                    }
                } catch(Exception e) {
                    response = "{\"success\":false}";
                }
                sendJsonResponse(t, response);
            }
        }
    }

    private static String getBody(HttpExchange t) throws IOException {
        InputStream ios = t.getRequestBody();
        byte[] bytes = new byte[ios.available()];
        ios.read(bytes);
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private static void sendJsonResponse(HttpExchange t, String response) throws IOException {
        t.getResponseHeaders().set("Content-Type", "application/json");
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        t.sendResponseHeaders(200, bytes.length);
        OutputStream os = t.getResponseBody();
        os.write(bytes);
        os.close();
    }

    private static String extractJsonString(String json, String key) {
        String search = "\"" + key + "\":\"";
        int start = json.indexOf(search);
        if (start == -1) return null;
        start += search.length();
        int end = json.indexOf("\"", start);
        if (end == -1) return null;
        return json.substring(start, end);
    }

    private static String extractJsonNumber(String json, String key) {
        String search = "\"" + key + "\":";
        int start = json.indexOf(search);
        if (start == -1) return null;
        start += search.length();
        int end = start;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '.' || json.charAt(end) == '-')) {
            end++;
        }
        return json.substring(start, end);
    }
}
