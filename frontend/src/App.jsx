import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd-mobile';
import Login from './pages/Login';
import Register from './pages/Register';
import AccountBookList from './pages/AccountBookList';
import AccountBookDetail from './pages/AccountBookDetail';
import TransactionForm from './pages/TransactionForm';
import Profile from './pages/Profile';
import SplitBill from './pages/SplitBill';
import DocsPage from './pages/DocsPage';

// 路由守卫组件
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <ConfigProvider
      theme={{
        primaryColor: '#C8E64E',
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account-books" element={<PrivateRoute><AccountBookList /></PrivateRoute>} />
          <Route path="/account-books/:id" element={<PrivateRoute><AccountBookDetail /></PrivateRoute>} />
          <Route path="/account-books/:id/transactions/new" element={<PrivateRoute><TransactionForm /></PrivateRoute>} />
          <Route path="/account-books/:id/transactions/:transactionId/edit" element={<PrivateRoute><TransactionForm /></PrivateRoute>} />
          <Route path="/account-books/:id/split-bill" element={<PrivateRoute><SplitBill /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/docs" element={<PrivateRoute><DocsPage /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/account-books" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
