-- Seed Dummy Data for AIRism Reimbursement System (Fixed for snake_case schema)
-- This script creates dummy data for testing the Request Module Refactor

-- Clear existing data
TRUNCATE TABLE reimbursements, assets, projects, users, documents CASCADE;

-- ============================================
-- 1. INSERT USERS (password: password123)
-- ============================================

INSERT INTO users (id, email, name, password_hash, role, status, lead_id) VALUES
(1, 'john.lead@airism.com', 'John Lead', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'lead', 'ACTIVE', NULL),
(2, 'sarah.lead@airism.com', 'Sarah Lead', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'lead', 'ACTIVE', NULL),
(3, 'michael.head@airism.com', 'Michael Head', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'head', 'ACTIVE', NULL),
(4, 'lisa.finance@airism.com', 'Lisa Finance', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'finance', 'ACTIVE', NULL),
(5, 'alice.tester@airism.com', 'Alice Tester', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'tester', 'ACTIVE', 1),
(6, 'bob.tester@airism.com', 'Bob Tester', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'tester', 'ACTIVE', 1),
(7, 'charlie.tester@airism.com', 'Charlie Tester', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'tester', 'ACTIVE', 2),
(8, 'diana.tester@airism.com', 'Diana Tester', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'tester', 'ACTIVE', 2),
(9, 'evan.tester@airism.com', 'Evan Tester', 'f1e2d3c4b5a69788:ef162fd0a15b21b1f57449084bd2e294d4b4848f2a463d7ef2187523be85ccaa0ae8a3ec886364f46d5aa27a623b59c441e4c81ffd0f50ea0bd8b9513d16baeb', 'tester', 'ACTIVE', 1);

-- ============================================
-- 2. INSERT PROJECTS
-- ============================================

INSERT INTO projects (id, project_id, name, status) VALUES
(1, '5-002-079', 'MaxStream', 'ACTIVE'),
(2, '5-002-080', 'MyOrbit', 'ACTIVE'),
(3, '5-002-081', 'Dunia Games', 'ACTIVE'),
(4, '5-002-082', 'Legacy Project', 'INACTIVE');

-- ============================================
-- 3. INSERT ASSETS
-- ============================================

INSERT INTO assets (id, asset_number, description, registration_date, created_by, status) VALUES
(1, 'AST-2024-001', 'Laptop Dell XPS 15', '2023-10-01', 5, 'ACTIVE'),
(2, 'AST-2024-002', 'iPhone 14 Pro', '2023-11-01', 6, 'ACTIVE'),
(3, 'AST-2024-003', 'MacBook Pro M2', '2023-09-01', 7, 'ACTIVE'),
(4, 'AST-HQ-001', 'MacBook Pro M3 - Alice', '2023-12-01', 5, 'ACTIVE');

-- ============================================
-- 4. INSERT REIMBURSEMENTS
-- ============================================

INSERT INTO reimbursements (
    id, user_id, employee_name, employee_email, amount, description, 
    project, status, date, lead_id, lead_name
) VALUES
(1, 5, 'Alice Tester', 'alice.tester@airism.com', 150000, 'Pembelian ATK MaxStream', 'MaxStream', 'pending', '2024-01-15', 1, 'John Lead'),
(2, 6, 'Bob Tester', 'bob.tester@airism.com', 250000, 'Transport meeting client', 'MyOrbit', 'pending', '2024-01-16', 1, 'John Lead'),
(3, 7, 'Charlie Tester', 'charlie.tester@airism.com', 180000, 'Makan siang team meeting', 'Dunia Games', 'pending', '2024-01-17', 2, 'Sarah Lead'),
(4, 5, 'Alice Tester', 'alice.tester@airism.com', 75000, 'Parkir meeting Gedung Telkomsel', 'MaxStream', 'approved_by_finance', '2024-01-20', 1, 'John Lead'),
(5, 5, 'Alice Tester', 'alice.tester@airism.com', 1200000, 'Beli Kursi Gaming (Invalid)', 'MyOrbit', 'rejected', '2024-01-21', 1, 'John Lead');

-- ============================================
-- 5. SYNCHRONIZE SEQUENCES
-- ============================================

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));
SELECT setval('assets_id_seq', (SELECT MAX(id) FROM assets));
SELECT setval('reimbursements_id_seq', (SELECT MAX(id) FROM reimbursements));
