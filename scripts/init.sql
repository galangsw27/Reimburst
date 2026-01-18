-- Database initialization script for reimbursement application
-- This file runs automatically when the PostgreSQL container is first created

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('head', 'finance', 'lead', 'user')),
  lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reimbursements table
CREATE TABLE IF NOT EXISTS reimbursements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_name VARCHAR(255) NOT NULL,
  employee_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  project VARCHAR(100) NOT NULL,
  date VARCHAR(50),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved_by_head', 'approved_by_lead', 'approved_by_finance', 'rejected')),
  receipt_image TEXT,
  asset VARCHAR(255),
  approvals JSONB DEFAULT '{}',
  rejection_reason TEXT,
  lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  lead_name VARCHAR(255),
  submission_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approval_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_lead_id ON users(lead_id);

-- Create indexes for reimbursements table
CREATE INDEX IF NOT EXISTS idx_reimbursements_user_id ON reimbursements(user_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON reimbursements(status);
CREATE INDEX IF NOT EXISTS idx_reimbursements_submission_date ON reimbursements(submission_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reimbursements_updated_at
  BEFORE UPDATE ON reimbursements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
