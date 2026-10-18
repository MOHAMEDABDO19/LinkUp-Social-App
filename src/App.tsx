import type { ReactNode } from "react";
import { createBrowserRouter, RouterProvider, Navigate, Link } from "react-router-dom";
import Register from "./Pages/Register/Register";
import Login from "./Pages/Login/Login";
import Home from "./Pages/Home/Home";
import Profile from "./Pages/Profile/Profile";
import PostPage from "./Pages/PostPage/PostPage";
import Bookmarks from "./Components/BockMark/BockMark";
 import Layout from "./Layout/Layout";

// حماية الصفحات: لو مفيش توكن يروح للتسجيل
function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/register" replace />;
  return <>{children}</>;
}

// منع المسجّل من فتح صفحات الدخول والتسجيل
function PublicRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

// الصفحة الرئيسية: تتحقق من التوكن وقت الفتح (مش وقت تحميل الملف)
// كده بعد تسجيل الدخول أو الخروج التحويل يشتغل صح
function RootRedirect() {
  const token = localStorage.getItem("token");
  return <Navigate to={token ? "/home" : "/register"} replace />;
}

function NotFound() {
  return (
    <div className="page flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-extrabold text-brand-400">404</p>
      <h1 className="text-xl font-bold">الصفحة دي مش موجودة</h1>
      <p className="text-slate-400">ممكن الرابط غلط أو الصفحة اتنقلت.</p>
      <Link to="/" className="btn">
        الرجوع للرئيسية
      </Link>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "",
    element: <Layout />,
    children: [
      { index: true, element: <RootRedirect /> },
      {
        path: "register",
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      {
        path: "login",
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: "home",
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: "posts/:id",
        element: (
          <ProtectedRoute>
            <PostPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "bookmarks",
        element: (
          <ProtectedRoute>
            <Bookmarks />
          </ProtectedRoute>
        ),
      },
    
      // بروفايلي
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      // بروفايل أي حد تاني (ده اللي كان ناقص وبيطلع 404)
      {
        path: "profile/:userId",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

App.displayName = "App";
export default App;