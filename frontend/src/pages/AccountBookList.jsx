import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar, Dialog, Toast } from 'antd-mobile';
import { AddOutline } from 'antd-mobile-icons';
import { accountBookAPI } from '../api/accountBook';
import { userAPI } from '../api/user';
import AccountBookForm from '../components/AccountBookForm';
import './AccountBookList.css';

// 根据目的地生成渐变色封面
const COVER_COLORS = [
  ['#FF9A9E', '#FECFEF'],
  ['#A18CD1', '#FBC2EB'],
  ['#FAD0C4', '#FFD1FF'],
  ['#FFECD2', '#FCB69F'],
  ['#A1C4FD', '#C2E9FB'],
  ['#D4FC79', '#96E6A1'],
  ['#84FAB0', '#8FD3F4'],
  ['#F6D365', '#FDA085'],
  ['#FCCB90', '#D57EEB'],
  ['#E0C3FC', '#8EC5FC'],
];

const COVER_ICONS = ['✈️', '🏖️', '🗻', '🌸', '🏯', '🎡', '🌊', '🏔️', '🌴', '🎪'];

function AccountBookList() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [userNickname, setUserNickname] = useState('');

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    loadBooks();
    loadUserProfile();
  }, [search, navigate]);

  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') { loadBooks(); loadUserProfile(); } };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await userAPI.getProfile();
      setUserAvatar(profile.avatar);
      setUserNickname(profile.nickname || '');
    } catch (error) { console.error('加载用户信息失败:', error); }
  };

  const loadBooks = async () => {
    try {
      const result = await accountBookAPI.getList({ search, page: 1, pageSize: 100 });
      setBooks(result.list || []);
    } catch (error) { console.error('加载账本失败:', error); }
  };

  const getCover = (book, index) => {
    const colors = COVER_COLORS[index % COVER_COLORS.length];
    const icon = COVER_ICONS[index % COVER_ICONS.length];
    return { colors, icon };
  };

  return (
    <div className="book-list-page">
      {/* 绿色导航栏 */}
      <div className="list-nav-bar">
        <h1 className="list-title">我的账本</h1>
        <div className="list-avatar" onClick={() => navigate('/profile')}>
          {userAvatar ? <img src={userAvatar} alt="" /> : <span>{userNickname ? userNickname.charAt(0) : '👤'}</span>}
        </div>
      </div>

      {/* 统计+搜索 */}
      <div className="list-sub-bar">
        <span className="list-stats">共计 {books.length} 个账本</span>
        <SearchBar placeholder="搜索" value={search} onChange={setSearch}
          style={{ '--background': '#f0f0f0', '--border-radius': '10px', flex: 1, maxWidth: '180px' }} />
      </div>

      {/* 网格卡片 */}
      {books.length === 0 ? (
        <div className="list-empty">
          <div className="empty-icon">📚</div>
          <p>还没有账本</p>
          <p className="empty-hint">点击右下角 + 创建第一个旅行账本</p>
        </div>
      ) : (
        <div className="book-grid">
          {books.map((book, index) => {
            const { colors, icon } = getCover(book, index);
            return (
              <div key={book.id} className="book-grid-card">
                <div className="book-cover"
                  style={book.cover && book.cover !== '0' ? { backgroundImage: `url(${book.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                  onClick={() => navigate(`/account-books/${book.id}`)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (ev) => {
                      const file = ev.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append('cover', file);
                      try {
                        await accountBookAPI.uploadCover(book.id, fd);
                        Toast.show({ icon: 'success', content: '封面已更新' });
                        loadBooks();
                      } catch { Toast.show({ icon: 'fail', content: '上传失败' }); }
                    };
                    input.click();
                  }}
                >
                  {(!book.cover || book.cover === '0') && <span className="book-cover-icon">{icon}</span>}
                  {book.is_archived === 1 && <span className="book-archived-badge">已封存</span>}
                </div>
                <div className="book-card-info" onClick={() => navigate(`/account-books/${book.id}`)}>
                  <div className="book-card-name">{book.name}</div>
                  <div className="book-card-meta">
                    <span>📍 {book.destination}</span>
                    <span className="book-card-date">
                      {new Date(book.start_date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} - {new Date(book.end_date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="book-card-bottom">
                    <span className="book-card-expense">¥{formatAmount(book.totalExpense)}</span>
                    {(book.memberCount || 0) > 0 && <span className="book-card-members">{book.memberCount}人</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 新建卡片 */}
          <div className="book-grid-card add-card" onClick={() => setShowForm(true)}>
            <div className="add-card-inner">
              <AddOutline fontSize={32} color="#ccc" />
              <span>新建账本</span>
            </div>
          </div>
        </div>
      )}

      {/* 浮动按钮组 */}
      <div className="list-fab-group">
        <div className="list-fab" onClick={() => setShowForm(true)}>
          <AddOutline fontSize={28} color="#1A1A2E" />
        </div>
      </div>

      {/* 创建表单 */}
      <AccountBookForm visible={showForm} onClose={() => setShowForm(false)}
        onSuccess={() => { setShowForm(false); loadBooks(); }} />
    </div>
  );
}

export default AccountBookList;
