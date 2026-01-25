-- Seed Dummy Data for AIRism Reimbursement System (Fixed for snake_case schema)
-- This script creates dummy data for testing the Request Module Refactor

-- Clear existing data (optional - uncomment if needed)
-- TRUNCATE TABLE reimbursements CASCADE;
-- TRUNCATE TABLE assets CASCADE;
-- TRUNCATE TABLE projects CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- ============================================
-- 1. INSERT USERS
-- ============================================

-- Insert Lead users (password: password123)
INSERT INTO users (id, email, name, password_hash, role, status, lead_id) VALUES
(1, 'john.lead@airism.com', 'John Lead', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'lead', 'ACTIVE', NULL),
(2, 'sarah.lead@airism.com', 'Sarah Lead', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'lead', 'ACTIVE', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Head user (password: password123)
INSERT INTO users (id, email, name, password_hash, role, status, lead_id) VALUES
(3, 'michael.head@airism.com', 'Michael Head', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'head', 'ACTIVE', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Finance user (password: password123)
INSERT INTO users (id, email, name, password_hash, role, status, lead_id) VALUES
(4, 'lisa.finance@airism.com', 'Lisa Finance', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'finance', 'ACTIVE', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Tester users (assigned to leads) (password: password123)
INSERT INTO users (id, email, name, password_hash, role, status, lead_id) VALUES
(5, 'alice.tester@airism.com', 'Alice Tester', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'tester', 'ACTIVE', 1),
(6, 'bob.tester@airism.com', 'Bob Tester', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'tester', 'ACTIVE', 1),
(7, 'charlie.tester@airism.com', 'Charlie Tester', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'tester', 'ACTIVE', 2),
(8, 'diana.tester@airism.com', 'Diana Tester', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'tester', 'ACTIVE', 2),
(9, 'evan.tester@airism.com', 'Evan Tester', '$2a$10$rZ5YhJKvXqKqKqKqKqKqKuXqKqKqKqKqKqKqKqKqKqKqKqKqK', 'tester', 'ACTIVE', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. INSERT PROJECTS
-- ============================================

INSERT INTO projects (id, project_id, name, status, created_at, updated_at) VALUES
(1, '5-002-079', 'MaxStream', 'ACTIVE', NOW() - INTERVAL '6 months', NOW()),
(2, '5-002-080', 'MyOrbit', 'ACTIVE', NOW() - INTERVAL '5 months', NOW()),
(3, '5-002-081', 'Dunia Games', 'ACTIVE', NOW() - INTERVAL '4 months', NOW()),
(4, '5-002-082', 'Legacy Project', 'INACTIVE', NOW() - INTERVAL '12 months', NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. INSERT ASSETS
-- ============================================

INSERT INTO assets (id, asset_number, description, registration_date, created_by, status, created_at, updated_at) VALUES
(1, 'AST-2024-001', 'Laptop Dell XPS 15', NOW() - INTERVAL '3 months', 5, 'ACTIVE', NOW() - INTERVAL '3 months', NOW()),
(2, 'AST-2024-002', 'iPhone 14 Pro', NOW() - INTERVAL '2 months', 6, 'ACTIVE', NOW() - INTERVAL '2 months', NOW()),
(3, 'AST-2024-003', 'MacBook Pro M2', NOW() - INTERVAL '4 months', 7, 'ACTIVE', NOW() - INTERVAL '4 months', NOW()),
(4, 'AST-2024-004', 'Samsung Galaxy S23', NOW() - INTERVAL '1 month', 8, 'ACTIVE', NOW() - INTERVAL '1 month', NOW()),
(5, 'AST-2024-005', 'iPad Air', NOW() - INTERVAL '2 months', 9, 'ACTIVE', NOW() - INTERVAL '2 months', NOW()),
(6, 'AST-2023-099', 'Old Laptop', NOW() - INTERVAL '12 months', 5, 'INACTIVE', NOW() - INTERVAL '12 months', NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. INSERT REIMBURSEMENTS
-- ============================================

-- Pending requests (waiting for lead approval)
INSERT INTO reimbursements (
    id, user_id, date, amount, description, 
    project, status, created_at, updated_at, lead_id
) VALUES
(1, 5, '2024-01-15', 150000, 
 'Pembelian alat tulis kantor untuk project MaxStream', 'MaxStream', 'pending', 
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 1),
 
(2, 6, '2024-01-16', 250000, 
 'Biaya transportasi meeting client', 'MyOrbit', 'pending', 
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1),
 
(3, 7, '2024-01-17', 180000, 
 'Makan siang team meeting', 'Dunia Games', 'pending', 
 NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', 2)
ON CONFLICT (id) DO NOTHING;

-- Approved by lead (waiting for head approval)
INSERT INTO reimbursements (
    id, user_id, date, amount, description, 
    project, status, created_at, updated_at, lead_id, approvals
) VALUES
(4, 8, '2024-01-14', 320000, 
 'Pembelian software license', 'MaxStream', 'approved_by_lead', 
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 2,
 '{"lead": {"approved": true, "by": 2, "date": "2024-01-15T10:00:00Z", "comment": "Approved"}}'::jsonb),
 
(5, 9, '2024-01-13', 450000, 
 'Biaya perjalanan dinas ke Surabaya', 'MyOrbit', 'approved_by_lead', 
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', 1,
 '{"lead": {"approved": true, "by": 1, "date": "2024-01-14T14:30:00Z", "comment": "Approved"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Approved by head (waiting for finance approval)
INSERT INTO reimbursements (
    id, user_id, date, amount, description, 
    project, status, created_at, updated_at, lead_id, approvals
) VALUES
(6, 5, '2024-01-12', 280000, 
 'Pembelian peralatan testing', 'MaxStream', 'approved_by_head', 
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', 1,
 '{"lead": {"approved": true, "by": 1, "date": "2024-01-13T09:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": 3, "date": "2024-01-14T11:00:00Z", "comment": "Approved"}}'::jsonb),
 
(7, 6, '2024-01-11', 195000, 
 'Biaya internet dan komunikasi', 'Dunia Games', 'approved_by_head', 
 NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', 1,
 '{"lead": {"approved": true, "by": 1, "date": "2024-01-12T10:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": 3, "date": "2024-01-13T15:00:00Z", "comment": "Approved"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Fully approved (approved by finance)
INSERT INTO reimbursements (
    id, user_id, date, amount, description, 
    project, status, created_at, updated_at, lead_id, approvals
) VALUES
(8, 7, '2024-01-10', 350000, 
 'Pembelian hardware untuk development', 'MaxStream', 'approved_by_finance', 
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 hour', 2,
 '{"lead": {"approved": true, "by": 2, "date": "2024-01-11T09:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": 3, "date": "2024-01-12T10:00:00Z", "comment": "Approved"}, "finance": {"approved": true, "by": 4, "date": "2024-01-13T14:00:00Z", "comment": "Approved and processed"}}'::jsonb),
 
(9, 8, '2024-01-09', 420000, 
 'Biaya training dan sertifikasi', 'MyOrbit', 'approved_by_finance', 
 NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 hours', 2,
 '{"lead": {"approved": true, "by": 2, "date": "2024-01-10T08:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": 3, "date": "2024-01-11T09:00:00Z", "comment": "Approved"}, "finance": {"approved": true, "by": 4, "date": "2024-01-12T13:00:00Z", "comment": "Approved and processed"}}'::jsonb),
 
(10, 9, '2024-01-08', 275000, 
 'Pembelian buku dan referensi teknis', 'Dunia Games', 'approved_by_finance', 
 NOW() - INTERVAL '9 days', NOW() - INTERVAL '3 hours', 1,
 '{"lead": {"approved": true, "by": 1, "date": "2024-01-09T10:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": 3, "date": "2024-01-10T11:00:00Z", "comment": "Approved"}, "finance": {"approved": true, "by": 4, "date": "2024-01-11T14:00:00Z", "comment": "Approved and processed"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Rejected requests
INSERT INTO reimbursements (
    id, user_id, date, amount, description, 
    project, status, created_at, updated_at, lead_id, rejection_reason, approvals
) VALUES
(11, 5, '2024-01-07', 500000, 
 'Pembelian laptop pribadi', 'MaxStream', 'rejected', 
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 1,
 'Item tidak sesuai dengan kebijakan reimbursement perusahaan',
 '{"lead": {"approved": false, "by": 1, "date": "2024-01-08T10:00:00Z", "comment": "Rejected - not company related"}}'::jsonb),
 
(12, 6, '2024-01-06', 800000, 
 'Biaya entertainment pribadi', 'MyOrbit', 'rejected', 
 NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days', 1,
 'Tidak ada bukti transaksi yang valid',
 '{"lead": {"approved": false, "by": 1, "date": "2024-01-07T09:00:00Z", "comment": "Rejected - no valid receipt"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- More requests for different projects
INSERT INTO reimbursements (
    id, user_id, date, amount, description, 
    project, status, created_at, updated_at, lead_id
) VALUES
(13, 7, '2024-01-18', 165000, 
 'Biaya parkir dan tol perjalanan dinas', 'MaxStream', 'pending', 
 NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', 2),
 
(14, 8, '2024-01-18', 220000, 
 'Pembelian accessories untuk testing', 'MyOrbit', 'pending', 
 NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', 2),
 
(15, 9, '2024-01-18', 310000, 
 'Biaya subscription tools development', 'Dunia Games', 'pending', 
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 'Data seeding completed!' as message;

SELECT 'Users:' as category, COUNT(*) as count FROM users
UNION ALL
SELECT 'Projects:', COUNT(*) FROM projects
UNION ALL
SELECT 'Assets:', COUNT(*) FROM assets
UNION ALL
SELECT 'Reimbursements:', COUNT(*) FROM reimbursements;

SELECT 
    'Reimbursement Status Summary:' as summary,
    status,
    COUNT(*) as count
FROM reimbursements
GROUP BY status
ORDER BY status;
