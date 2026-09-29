import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, ArrowLeft, ArrowRight, Bell, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Copy, Crown, DoorOpen, Flag, Gamepad2, History, Home, LayoutGrid, Leaf, LockKeyhole, LogOut, Menu, MessageCircle, Plus, Search, Send, Settings2, ShieldCheck, Sparkles, Trophy, Users, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { findMove, newGame, sortCards, takeTurn } from './game.js';

const initialRooms = [
  { id: '1024', name: 'Cà phê & vài ván bài', host: 'Minh Anh', avatar: 'MA', color: 'peach', count: 2, max: 4, tag: 'Thư giãn', status: 'waiting' },
  { id: '1025', name: 'Hội bạn thân', host: 'Hoàng Nam', avatar: 'HN', color: 'lavender', count: 3, max: 4, tag: 'Vui là chính', status: 'waiting' },
  { id: '1026', name: 'Cao thủ hội tụ', host: 'Đức Huy', avatar: 'DH', color: 'sage', count: 4, max: 4, tag: 'Thử thách', status: 'playing' },
  { id: '1027', name: 'Một ván trước khi ngủ', host: 'Linh Chi', avatar: 'LC', color: 'pink', count: 1, max: 2, tag: 'Thư giãn', status: 'waiting' },
  { id: '1028', name: 'Trạm dừng chân', host: 'Tuấn Kiệt', avatar: 'TK', color: 'blue', count: 2, max: 4, tag: 'Người mới', status: 'waiting' },
  { id: '1029', name: 'Cuối tuần chill chill', host: 'Hà My', avatar: 'HM', color: 'yellow', count: 3, max: 4, tag: 'Vui là chính', status: 'waiting', locked: true },
];
const names = ['Bạn', 'Minh Anh', 'Hoàng Nam', 'Linh Chi'];
function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* App remains usable when storage is unavailable. */ } }
function Avatar({ name = 'B', color = 'sage', small = false }) { return <span className={`avatar ${color} ${small ? 'small' : ''}`}>{name.slice(0, 2)}</span>; }
function Card({ card, decorative = false, selected = false, onClick, back = false, style }) {
  if (back) return <div className="playing-card card-back" style={style}><div>♠</div></div>;
  const content = <><span className="card-corner">{card.rank}<small>{card.suit}</small></span><span className="card-suit">{card.suit}</span><span className="card-corner bottom">{card.rank}<small>{card.suit}</small></span></>;
  return decorative ? <div className={`playing-card ${card.red ? 'red' : ''}`} style={style}>{content}</div> : <button className={`playing-card ${card.red ? 'red' : ''} ${selected ? 'selected' : ''}`} style={style} onClick={onClick} aria-label={`${card.rank} ${card.suit}`} aria-pressed={selected}>{content}</button>;
}
function Modal({ title, subtitle, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    ref.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = ref.current.querySelectorAll('button, input, select, [tabindex="0"]');
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; before?.focus(); };
  }, [onClose]);
  return <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`modal ${wide ? 'wide' : ''}`}><button className="icon-button close" aria-label="Đóng" onClick={onClose}><X size={21} /></button><div className="modal-emblem"><Leaf size={25} /></div><h2 id="modal-title">{title}</h2>{subtitle && <p className="muted modal-subtitle">{subtitle}</p>}{children}</section></div>;
}

export default function App() {
  const [page, setPage] = useState('lobby');
  const [profile, setProfile] = useState(() => readStore('labai-profile', null));
  const [history, setHistory] = useState(() => readStore('labai-history', []));
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [capacity, setCapacity] = useState('all');
  const [rooms, setRooms] = useState(initialRooms);
  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chat, setChat] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [muted, setMuted] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [formError, setFormError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const chatEnd = useRef(null);
  const displayName = profile?.name || 'Bạn mới';
  const wins = history.filter(g => g.won).length;
  const notify = message => setToast(message);
  const openModal = value => { setFormError(''); setModal(value); };
  const navigate = value => { setPage(value); setMobileNav(false); };

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 4000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (page !== 'game' || !game || game.winner !== null || game.turn === 0) return;
    const timer = setTimeout(() => {
      const cards = findMove(game.hands[game.turn], game.pile, game.requiredId) || [];
      const result = takeTurn(game, game.turn, cards);
      if (result.game) setGame(result.game);
    }, 1400);
    return () => clearTimeout(timer);
  }, [game, page]);
  useEffect(() => {
    setCountdown(30);
    if (page !== 'game' || !game || game.winner !== null) return;
    const interval = setInterval(() => setCountdown(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(interval);
  }, [game?.move, page, game?.winner]);
  useEffect(() => {
    if (countdown !== 0 || !game || game.turn !== 0 || game.winner !== null || page !== 'game') return;
    const cards = game.pile.length ? [] : findMove(game.hands[0], [], game.requiredId);
    const result = takeTurn(game, 0, cards || []);
    if (result.game) { setGame(result.game); setSelected([]); notify('Hết thời gian: hệ thống đã tự động xử lý lượt.'); }
  }, [countdown, game, page]);
  useEffect(() => {
    if (game?.winner === null || game?.winner === undefined) return;
    const entry = { id: room?.matchId, room: room?.name, won: game.winner === 0, players: game.hands.length, date: new Date().toISOString(), left: game.hands[0].length };
    setHistory(old => { if (old.some(h => h.id === entry.id)) return old; const next = [entry, ...old].slice(0, 100); saveStore('labai-history', next); return next; });
    setModal('result');
  }, [game?.winner, room?.matchId]);

  function enterRoom(target) {
    setRoom({ ...target, matchId: crypto.randomUUID() }); setPage('waiting'); setModal(null); setGame(null);
    setMessages([{ id: crypto.randomUUID(), system: true, text: 'Bạn đã vào phòng chơi thử. Những người chơi khác là máy.' }]);
  }
  function startGame() { setRoom(r => ({ ...r, matchId: crypto.randomUUID() })); setGame(newGame(room.max)); setSelected([]); setPage('game'); setModal(null); }
  function play(cards) {
    const result = takeTurn(game, 0, cards);
    if (result.error) return notify(result.error);
    setGame(result.game); setSelected([]);
  }
  function join(target) {
    if (target.status === 'playing') return notify('Phòng đang chơi. Hãy chọn một phòng đang chờ.');
    if (target.locked) { setRoom(target); openModal('password'); return; }
    enterRoom(target);
  }
  function submitCreate(e) {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const name = data.get('name').trim();
    if (!name) return setFormError('Hãy đặt tên cho phòng của bạn.');
    const password = data.get('password').trim();
    const target = { id: String(Date.now()).slice(-6), name, host: displayName, avatar: displayName.slice(0, 2).toUpperCase(), color: 'sage', count: 1, max: Number(data.get('max')), tag: data.get('tag'), status: 'waiting', locked: !!password, password };
    setRooms(old => [target, ...old]); enterRoom(target);
  }
  function submitJoin(e) {
    e.preventDefault(); const code = new FormData(e.currentTarget).get('code').trim().replace('#', '');
    const target = rooms.find(r => r.id === code);
    if (!target) return setFormError('Không tìm thấy phòng. Kiểm tra lại mã phòng nhé.');
    if (target.status === 'playing') return setFormError('Phòng đang chơi. Vui lòng chọn phòng khác.');
    join(target);
  }
  function submitAuth(e) {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const name = (data.get('name') || data.get('email').split('@')[0]).trim();
    if (!name) return setFormError('Vui lòng nhập tên hiển thị.');
    const user = { name, email: data.get('email') };
    saveStore('labai-profile', user); setProfile(user); setModal(null); notify('Đã lưu hồ sơ chơi thử của bạn.');
  }
  function sendChat(e) { e.preventDefault(); if (!chat.trim()) return; setMessages(old => [...old, { id: crypto.randomUUID(), name: displayName, text: chat.trim() }]); setChat(''); }
  const visibleRooms = rooms.filter(r => (!query || `${r.name} ${r.id} ${r.host}`.toLowerCase().includes(query.toLowerCase())) && (filter === 'all' || (filter === 'waiting' ? r.status === 'waiting' : r.tag === 'Người mới')) && (capacity === 'all' || r.max === Number(capacity)));

  const chatPanel = <aside className="chat-panel"><div className="chat-title"><MessageCircle size={18} /><h3>Trò chuyện</h3><span className="live-dot" /></div><div className="chat-messages">{messages.map(m => m.system ? <p className="system-message" key={m.id}>{m.text}</p> : <div className="chat-message" key={m.id}><Avatar name={m.name} small /><div><strong>{m.name} <span>Bạn</span></strong><p>{m.text}</p></div></div>)}<div ref={chatEnd} /></div><form className="chat-input" onSubmit={sendChat}><input aria-label="Tin nhắn" placeholder="Nói gì đó thật vui…" value={chat} onChange={e => setChat(e.target.value)} maxLength={300} /><button aria-label="Gửi tin nhắn" disabled={!chat.trim()}><Send size={17} /></button></form><p className="chat-foot"><ShieldCheck size={12} /> Chơi vui, trò chuyện văn minh.</p></aside>;

  return <div className="app-shell">
    {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <button className="brand" onClick={() => navigate('lobby')}><span className="brand-mark">♠</span><span>Lá Bài<span className="brand-caption">KẾT NỐI QUA TỪNG VÁN</span></span></button>
      <div className="sidebar-label">KHÔNG GIAN CỦA BẠN</div>
      <nav>{[{ id: 'home', icon: Home, label: 'Trang chủ' }, { id: 'lobby', icon: LayoutGrid, label: 'Sảnh chờ' }, { id: 'history', icon: History, label: 'Lịch sử đấu' }].map(({ id, icon: Icon, label }) => <button key={id} className={`nav-item ${page === id || (id === 'lobby' && ['waiting', 'game'].includes(page)) ? 'active' : ''}`} onClick={() => { if (['game', 'waiting'].includes(page)) openModal('leave'); else navigate(id); }}><Icon size={19} /><span>{label}</span>{id === 'lobby' && <span className="nav-count">{rooms.length}</span>}</button>)}</nav>
      <div className="sidebar-label second-label">KHÁM PHÁ</div>
      <button className="nav-item" onClick={() => openModal('rules')}><BookOpen size={19} /><span>Luật chơi</span><span className="tiny-suit">♣</span></button>
      <button className="nav-item" onClick={() => openModal('help')}><CircleHelp size={19} /><span>Trợ giúp</span></button>
      <div className="sidebar-bottom"><div className="sidebar-note"><div className="note-symbol">✳</div><h3>Vui một ván.<br />Gần nhau hơn.</h3><p>Một chút may mắn,<br />một bàn đầy tiếng cười.</p><span className="note-doodle">♧</span></div><button className="sidebar-profile" onClick={() => openModal(profile ? 'profile' : 'auth')}><Avatar name={profile ? profile.name.slice(0, 2).toUpperCase() : 'B'} /><span><strong>{displayName}</strong><small><span className="live-dot" /> Sẵn sàng chơi</small></span><Settings2 size={17} /></button></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button><span>Không gian chơi</span><ChevronRight size={14} /><strong>{({ home: 'Trang chủ', lobby: 'Sảnh chờ', history: 'Lịch sử đấu', waiting: 'Phòng chờ', game: 'Bàn chơi' })[page]}</strong></div><div className="topbar-right"><span className="demo-badge"><span className="live-dot" /> Chế độ chơi thử</span><span className="topbar-divider" /><button className="icon-button notification" aria-label="Thông báo" onClick={() => openModal('notifications')}><Bell size={19} /><i /></button><button className="header-avatar" aria-label="Hồ sơ" onClick={() => openModal(profile ? 'profile' : 'auth')}><Avatar name={profile ? profile.name.slice(0, 2).toUpperCase() : 'B'} small /></button></div></header>
      <main className={`main-content ${['game', 'waiting'].includes(page) ? 'table-content' : ''}`}>
        {(page === 'lobby' || page === 'home') && <>
          <div className="page-heading"><div><div className="eyebrow">GẶP NHAU BÊN BÀN BÀI</div><h1>{page === 'home' ? `Chào ${displayName}, chơi thôi!` : 'Sảnh chờ'}<span className="heading-dot">.</span></h1><p>Gác lại bộn bề, lên bài cùng bạn bè.</p></div><button className="button secondary join-code" onClick={() => openModal('join')}><DoorOpen size={17} /> Vào bằng mã phòng</button></div>
          <section className="hero"><div className="hero-copy"><div className="hero-kicker"><span /> TIẾN LÊN MIỀN NAM</div><h2>Một ván bài,<br />thêm một niềm vui<span>.</span></h2><p>52 lá bài. Những người bạn.<br />Và những cuộc vui chẳng cần hẹn trước.</p><button className="button cream" onClick={() => enterRoom(initialRooms[0])}><Zap size={17} fill="currentColor" /> Chơi ngay <ArrowRight size={17} /></button><div className="hero-meta"><span><Users size={14} /> 2–4 người chơi</span><i /><span>Miễn phí & không cá cược</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><span className="art-suit">♣</span><div className="card-fan"><Card decorative card={{ rank: 'A', suit: '♠' }} style={{ '--rotation': '-24deg', '--offset': '-85px', '--rise': '15px' }} /><Card decorative card={{ rank: '2', suit: '♥', red: true }} style={{ '--rotation': '-4deg', '--offset': '0px', '--rise': '-8px' }} /><Card decorative card={{ rank: 'K', suit: '♣' }} style={{ '--rotation': '19deg', '--offset': '84px', '--rise': '16px' }} /></div><div className="art-sticker"><span>100%</span><small>VUI LÀ CHÍNH</small></div><span className="art-caption">GOOD CARDS. GREAT COMPANY.</span></div></section>
          <div className="stats-strip"><div><span className="stat-icon"><DoorOpen size={20} /></span><strong>{rooms.length.toString().padStart(2, '0')}</strong><span>Phòng chơi mẫu</span></div><div><span className="stat-icon"><Users size={21} /></span><strong>2–4</strong><span>Người mỗi bàn</span></div><div><span className="stat-icon"><Trophy size={20} /></span><strong>{history.length.toString().padStart(2, '0')}</strong><span>Ván đã hoàn thành</span></div><div className="stats-message"><span className="live-dot" /> Một chỗ trống đang chờ bạn</div></div>
          {page === 'home' && <section className="welcome-banner"><div><Sparkles size={21} /><div><h3>Chơi vui từ ván đầu tiên</h3><p>Chọn bài, đánh bài, về nhất. Khám phá luật chơi chỉ trong vài phút.</p></div></div><button className="text-button" onClick={() => openModal('rules')}>Tìm hiểu luật <ArrowRight size={16} /></button></section>}
          <section className="rooms-section"><div className="section-heading"><div><h2>Tìm bàn hợp gu <span>{rooms.length}</span></h2><p>Chọn một phòng, cuộc vui bắt đầu từ đây.</p></div><button className="button primary" onClick={() => openModal('create')}><Plus size={18} /> Tạo phòng mới</button></div><div className="room-toolbar"><div className="filter-tabs">{[['all', 'Tất cả phòng'], ['waiting', 'Đang chờ'], ['beginner', 'Cho người mới']].map(([value, label]) => <button className={filter === value ? 'selected' : ''} key={value} onClick={() => setFilter(value)}>{label}{value === 'waiting' && <span className="live-dot" />}</button>)}</div><div className="room-search-tools"><label className="search-field"><Search size={17} /><input placeholder="Tìm tên hoặc mã phòng…" aria-label="Tìm phòng" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><X size={13} /></button>}</label><label className="capacity-select"><Users size={16} /><select aria-label="Số người chơi" value={capacity} onChange={e => setCapacity(e.target.value)}><option value="all">Số người</option><option value="2">2 người</option><option value="3">3 người</option><option value="4">4 người</option></select><ChevronDown size={13} /></label></div></div><div className="room-grid">{visibleRooms.map(r => <article className={`room-card ${r.status === 'playing' ? 'in-progress' : ''}`} key={r.id}><div className="room-card-top"><span className={`room-status ${r.status}`}><span />{r.status === 'waiting' ? 'Đang chờ' : 'Đang chơi'}</span><span className="room-code">{r.locked && <LockKeyhole size={12} />} #{r.id}</span></div><h3>{r.name}</h3><div className="room-host"><Avatar name={r.avatar} color={r.color} small /><span>{r.host}</span><Crown size={12} /></div><div className="room-card-bottom"><div className="room-seats" aria-label={`${r.count} trên ${r.max} người`}><div>{Array.from({ length: r.max }, (_, i) => <span className={i < r.count ? `filled ${r.color}` : ''} key={i}>{i < r.count ? <Users size={12} /> : <Plus size={12} />}</span>)}</div><span><b>{r.count}</b>/{r.max}</span></div><span className="room-tag">{r.tag}</span></div><button className="room-join" disabled={r.status === 'playing'} onClick={() => join(r)}>{r.status === 'playing' ? 'Ván bài đang diễn ra' : 'Vào phòng'}{r.status === 'playing' ? <Clock3 size={15} /> : <ArrowRight size={16} />}</button></article>)}</div>{!visibleRooms.length && <div className="empty-state"><Search size={32} /><h3>Chưa tìm thấy bàn hợp gu</h3><p>Thử tên khác hoặc bỏ bớt bộ lọc nhé.</p><button className="button secondary" onClick={() => { setQuery(''); setFilter('all'); setCapacity('all'); }}>Xóa bộ lọc</button></div>}</section>
          <section className="bottom-tip"><span className="tip-icon"><BookOpen size={21} /></span><div><strong>Lần đầu chơi Tiến lên?</strong><p>Đừng lo, ai cũng bắt đầu từ lá bài đầu tiên.</p></div><button onClick={() => openModal('rules')}>Xem luật chơi <ArrowRight size={16} /></button><span className="tip-decoration" aria-hidden="true">♠ ♥ ♣ ♦</span></section>
        </>}
        {page === 'history' && <><div className="page-heading"><div><div className="eyebrow">MỖI VÁN BÀI, MỘT CÂU CHUYỆN</div><h1>Lịch sử đấu<span className="heading-dot">.</span></h1><p>Nhìn lại những cuộc vui của bạn.</p></div></div><div className="history-stats"><div><Gamepad2 /><strong>{history.length}</strong><span>Ván đã chơi</span></div><div><Trophy /><strong>{wins}</strong><span>Ván chiến thắng</span></div><div><Flag /><strong>{history.length ? Math.round(wins / history.length * 100) : 0}%</strong><span>Tỉ lệ thắng</span></div></div>{history.length ? <div className="history-list">{history.map(h => <article key={h.id}><span className={`history-result ${h.won ? 'won' : ''}`}><Trophy size={23} /></span><div><h3>{h.room}</h3><p>{new Date(h.date).toLocaleString('vi-VN')} · {h.players} người · Chơi thử</p></div><strong>{h.won ? 'Chiến thắng' : `Còn ${h.left} lá`}</strong></article>)}</div> : <div className="empty-state history-empty"><div className="empty-suits">♠ <span>♥</span> ♣</div><h2>Câu chuyện đầu tiên đang chờ</h2><p>Hoàn thành một ván chơi để lưu lại kết quả tại đây.</p><button className="button primary" onClick={() => navigate('lobby')}>Đến sảnh chờ <ArrowRight size={16} /></button></div>}</>}
        {['waiting', 'game'].includes(page) && room && <><div className="table-heading"><div><button className="text-button" onClick={() => openModal('leave')}><ArrowLeft size={16} /> Sảnh chờ</button><h1>{room.name}</h1><p>Tiến lên miền Nam <span>·</span> {room.max} người <span>·</span> Phòng #{room.id}</p></div><div className="table-tools"><button className="icon-button" aria-label={muted ? 'Bật âm báo' : 'Tắt âm báo'} onClick={() => { setMuted(!muted); notify('Chế độ thử hiện chưa có âm thanh.'); }}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button><button className="button secondary" onClick={() => { navigator.clipboard?.writeText(room.id).then(() => notify('Đã sao chép mã phòng.')).catch(() => notify(`Mã phòng của bạn: ${room.id}`)); }}><Copy size={15} /> {room.id}</button><button className="icon-button" aria-label="Luật chơi" onClick={() => openModal('rules')}><CircleHelp size={20} /></button></div></div><div className="game-layout"><section className={`table-stage ${page === 'waiting' ? 'waiting-stage' : ''}`}><div className="felt-table"><div className="felt-inner"><span className="felt-logo">♠ Lá Bài</span><span className="felt-subtitle">TIẾN LÊN MIỀN NAM</span></div></div>{Array.from({ length: room.max - 1 }, (_, i) => { const player = i + 1; return <div className={`table-player player-${player} count-${room.max} ${game?.turn === player && page === 'game' ? 'current-turn' : ''}`} key={i}><div className="player-avatar-wrap"><Avatar name={['MA', 'HN', 'LC'][i]} color={['peach', 'lavender', 'pink'][i]} />{page === 'game' && <span className="card-count">{game.hands[player].length}</span>}</div><strong>{names[player]}</strong><span>{page === 'waiting' ? 'Máy · Sẵn sàng' : game.passed.includes(player) ? 'Đã bỏ lượt' : game.turn === player ? 'Đang suy nghĩ…' : 'Máy'}</span>{page === 'game' && <div className="mini-cards">{Array.from({ length: Math.min(5, game.hands[player].length) }, (_, j) => <i key={j} />)}</div>}</div>; })}
          {page === 'waiting' ? <div className="waiting-center"><span className="waiting-leaf"><Leaf size={30} /></span><h2>Đủ bạn, lên bài thôi!</h2><p>Các bạn máy đã sẵn sàng.<br />Bắt đầu một ván để thử sức nhé.</p><button className="button cream" onClick={startGame}><Zap size={17} /> Bắt đầu ván bài</button></div> : <div className="table-center">{game.pile.length ? <><p>{game.lastPlayer === 0 ? 'Bạn' : names[game.lastPlayer]} vừa đánh</p><div className="pile-cards">{game.pile.map(c => <Card key={c.id} card={c} decorative />)}</div></> : <div className="new-round"><Sparkles size={25} /><h3>Vòng bài mới</h3><p>{game.turn === 0 ? 'Bạn được quyền ra bài trước' : `${names[game.turn]} ra bài trước`}</p></div>}</div>}
          <div className={`self-player ${game?.turn === 0 && page === 'game' ? 'current-turn' : ''}`}><Avatar name={profile ? profile.name.slice(0, 2).toUpperCase() : 'B'} /><div><strong>{displayName} <span>Bạn</span></strong><small>{page === 'waiting' ? 'Chủ bàn chơi thử' : game.turn === 0 ? `Lượt của bạn · ${countdown}s` : 'Chờ đến lượt'}</small></div>{page === 'waiting' && <span className="ready-badge"><Check size={13} /> Sẵn sàng</span>}</div>
          </section>{chatPanel}{page === 'game' && game && <section className="hand-panel"><div className="hand-topline"><span><span className={`live-dot ${game.turn === 0 ? '' : 'neutral'}`} />{game.winner !== null ? 'Ván bài đã kết thúc' : game.turn === 0 ? 'Đến lượt bạn rồi!' : `Đang chờ ${names[game.turn]}…`}</span><button className="text-button" onClick={() => { setGame(g => ({ ...g, hands: g.hands.map(sortCards) })); notify('Đã xếp bài từ nhỏ đến lớn.'); }}><ArrowDownUp size={14} /> Xếp bài</button></div><div className="hand-cards">{game.hands[0].map(c => <Card key={c.id} card={c} selected={selected.includes(c.id)} onClick={() => setSelected(old => old.includes(c.id) ? old.filter(id => id !== c.id) : [...old, c.id])} />)}</div><div className="hand-actions"><p aria-live="polite">{game.notice}</p><div><button className="button secondary" disabled={game.turn !== 0 || game.winner !== null} onClick={() => { const move = findMove(game.hands[0], game.pile, game.requiredId); if (!move) notify('Không có bộ bài phù hợp. Bạn có thể bỏ lượt.'); setSelected(move?.map(c => c.id) || []); }}><Sparkles size={15} /> Gợi ý</button><button className="button secondary" disabled={game.turn !== 0 || !game.pile.length || game.winner !== null} onClick={() => play([])}>Bỏ lượt</button><button className="button primary" disabled={game.turn !== 0 || !selected.length || game.winner !== null} onClick={() => play(game.hands[0].filter(c => selected.includes(c.id)))}>Đánh bài {selected.length > 0 && <span className="button-count">{selected.length}</span>}<ArrowRight size={16} /></button></div></div></section>}</div><p className="demo-note"><ShieldCheck size={14} /> Bàn chơi thử với máy · Chat được lưu trong phiên · Chưa kết nối máy chủ</p></>}
        <footer className="page-footer"><span><span className="footer-spade">♠</span> Lá Bài <span className="footer-divider">/</span> Kết nối qua từng ván.</span><span>Chơi vui. Chơi đẹp. <span className="footer-heart">♡</span></span></footer>
      </main>
    </div>
    {toast && <div className="toast" role="status"><span><Check size={16} /></span>{toast}<button className="icon-button" aria-label="Ẩn thông báo" onClick={() => setToast('')}><X size={15} /></button></div>}
    {modal && <Modal title={({ create: 'Tạo một cuộc vui', join: 'Có hẹn ở phòng nào?', auth: authMode === 'login' ? 'Mừng bạn trở lại' : 'Chào bạn mới!', rules: 'Luật nhỏ, cuộc vui lớn', help: 'Mình có thể giúp gì?', notifications: 'Góc thông báo', profile: 'Hồ sơ của bạn', password: 'Phòng dành cho bạn bè', leave: 'Rời bàn chơi?', result: game?.winner === 0 ? 'Một ván thật xuất sắc!' : 'Ván vui đã khép lại!' })[modal]} subtitle={modal === 'create' ? 'Đặt tên cho bàn, rủ thêm niềm vui.' : modal === 'join' ? 'Nhập mã phòng để tìm đúng bàn của bạn.' : null} onClose={() => setModal(null)} wide={modal === 'rules'}>
      {modal === 'create' && <form className="modal-form" onSubmit={submitCreate}><label>Tên phòng<input name="name" placeholder="Ví dụ: Hội bạn cuối tuần" required maxLength={40} autoFocus /></label><div className="form-row"><label>Số người<select name="max" defaultValue="4"><option value="2">2 người</option><option value="3">3 người</option><option value="4">4 người</option></select></label><label>Phong cách<select name="tag"><option>Thư giãn</option><option>Vui là chính</option><option>Người mới</option><option>Thử thách</option></select></label></div><label>Mật khẩu <span className="optional">không bắt buộc</span><input name="password" type="password" placeholder="Để trống nếu ai cũng có thể vào" maxLength={32} /></label><p className="form-info"><ShieldCheck size={17} /> Phòng được tạo trên thiết bị này. Bạn sẽ chơi cùng máy trong phiên thử.</p>{formError && <p className="form-error" role="alert">{formError}</p>}<button className="button primary full-width"><Plus size={17} /> Tạo phòng</button></form>}
      {modal === 'join' && <form className="modal-form" onSubmit={submitJoin}><label>Mã phòng<input name="code" placeholder="Ví dụ: 1024" required autoFocus maxLength={10} /></label>{formError && <p className="form-error" role="alert">{formError}</p>}<button className="button primary full-width">Vào phòng <ArrowRight size={17} /></button><p className="form-footnote">Bạn có thể thử mã <b>1024</b> để chơi cùng máy.</p></form>}
      {modal === 'password' && <form className="modal-form" onSubmit={e => { e.preventDefault(); const password = new FormData(e.currentTarget).get('password'); if (password !== (room.password || '1234')) return setFormError('Mật khẩu chưa đúng. Thử lại nhé.'); enterRoom(room); }}><p className="muted">Nhập mật khẩu để vào “{room?.name}”.</p><label>Mật khẩu<input name="password" type="password" required autoFocus /></label>{!room?.password && <p className="form-footnote">Mật khẩu phòng mẫu: <b>1234</b></p>}{formError && <p className="form-error" role="alert">{formError}</p>}<button className="button primary full-width">Vào phòng <ArrowRight size={16} /></button></form>}
      {modal === 'auth' && <><div className="auth-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setFormError(''); }}>Đăng nhập</button><button className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setFormError(''); }}>Đăng ký</button></div><form className="modal-form" onSubmit={submitAuth}>{authMode === 'register' && <label>Tên hiển thị<input name="name" required maxLength={24} placeholder="Mọi người gọi bạn là gì?" /></label>}<label>Email<input name="email" type="email" required placeholder="ban@email.com" /></label><label>Mật khẩu<input name="password" type="password" required minLength={6} placeholder="Ít nhất 6 ký tự" /></label>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="form-info"><ShieldCheck size={18} /><span>Đây là giao diện thử. Chưa xác thực tài khoản; chỉ lưu tên và email trên thiết bị, không lưu mật khẩu.</span></div><button className="button primary full-width">{authMode === 'login' ? 'Vào chơi thử' : 'Tạo hồ sơ chơi thử'}<ArrowRight size={16} /></button></form></>}
      {modal === 'profile' && <div className="profile-details"><Avatar name={displayName.slice(0, 2).toUpperCase()} /><h3>{displayName}</h3><p>{profile?.email}</p><div className="profile-numbers"><span><b>{history.length}</b> Ván chơi</span><span><b>{wins}</b> Chiến thắng</span></div><p className="form-footnote">Hồ sơ chơi thử được lưu trên thiết bị này.</p><button className="button secondary full-width" onClick={() => { setProfile(null); saveStore('labai-profile', null); setModal(null); notify('Đã đăng xuất hồ sơ chơi thử.'); }}><LogOut size={16} /> Đăng xuất</button></div>}
      {modal === 'rules' && <div className="rules-content"><p className="muted">Phiên bản luật áp dụng cho bàn chơi thử của Lá Bài.</p>{[['01', '52 lá bài, 2–4 người', 'Mỗi người được chia 13 lá. Thứ tự từ nhỏ đến lớn: 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2. Cùng số, chất tăng dần: ♠ < ♣ < ♦ < ♥.'], ['02', 'Ra bài đúng bộ', 'Đánh một lá, đôi, sám cô, sảnh từ 3 lá hoặc đôi thông từ 3 đôi. Sảnh và đôi thông không chứa 2. Bộ đánh sau phải cùng loại, cùng số lá và lớn hơn bộ trước.'], ['03', 'Theo lượt, hoặc bỏ lượt', 'Người giữ lá nhỏ nhất trong các bài được chia đi trước và phải đánh lá đó. Khi bỏ lượt, bạn chờ hết vòng. Khi mọi người khác bỏ lượt, người đánh cuối được mở vòng mới. Mỗi lượt của bạn có 30 giây.'], ['04', 'Chặt heo, đổi thế cờ', 'Ba đôi thông chặt một lá 2. Tứ quý chặt một lá 2, đôi 2 hoặc ba đôi thông. Bốn đôi thông chặt một lá 2, đôi 2, ba đôi thông hoặc tứ quý. Trong bản thử, chặt vẫn tuân theo lượt.'], ['05', 'Hết bài trước, thắng cuộc', 'Người đầu tiên đánh hết bài chiến thắng. Ván đấu kết thúc và kết quả lưu trên thiết bị. Bản thử chưa áp dụng ăn trắng hay tính phạt.']].map(([n, title, text]) => <div className="rule" key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div>}
      {modal === 'help' && <div className="help-content"><h3>Bắt đầu thế nào?</h3><p>Chọn “Chơi ngay” hoặc vào một phòng đang chờ, sau đó bấm “Bắt đầu ván bài”. Nhấn vào các lá để chọn và bấm “Đánh bài”.</p><h3>Có thể chơi cùng bạn bè chưa?</h3><p>Hiện tại đây là frontend chạy thử với máy. Tạo phòng, mã phòng và chat hoạt động trong phiên trên thiết bị; chưa có kết nối nhiều người qua mạng.</p><h3>Kết quả được lưu ở đâu?</h3><p>Lịch sử và hồ sơ chơi thử được lưu trong trình duyệt. Xóa dữ liệu trình duyệt sẽ xóa các thông tin này.</p><button className="button secondary full-width" onClick={() => setModal('rules')}>Đọc luật chơi <BookOpen size={16} /></button></div>}
      {modal === 'notifications' && <div className="notification-content"><span className="notification-icon"><Sparkles size={25} /></span><h3>Chào mừng đến với Lá Bài</h3><p>Sảnh đã sẵn sàng. Chọn một bàn và tận hưởng ván Tiến lên đầu tiên của bạn!</p><span className="demo-badge">Phiên bản frontend · Chơi thử với máy</span></div>}
      {modal === 'leave' && <div className="leave-content"><p className="muted">{page === 'game' && game?.winner === null ? 'Ván bài đang diễn ra sẽ kết thúc và không lưu vào lịch sử.' : 'Bạn có thể quay lại sảnh để chọn một bàn khác.'}</p><div className="form-row"><button className="button secondary" onClick={() => setModal(null)}>Ở lại chơi</button><button className="button primary" onClick={() => { setPage('lobby'); setGame(null); setRoom(null); setModal(null); }}>Về sảnh chờ <ArrowRight size={16} /></button></div></div>}
      {modal === 'result' && game && <div className="result-content"><div className="result-trophy"><Trophy size={49} strokeWidth={1.4} /></div><p>{game.winner === 0 ? 'Bạn đã đánh hết bài và giành chiến thắng.' : `${names[game.winner]} đã về nhất. Ván sau mình gỡ nhé!`}</p><div className="result-players">{game.hands.map((h, i) => <div key={i}><span>{i === 0 ? displayName : names[i]}{i === game.winner && <Crown size={15} />}</span><strong>{i === game.winner ? 'Về nhất' : `Còn ${h.length} lá`}</strong></div>)}</div><p className="form-footnote"><Check size={13} /> Kết quả đã được lưu vào lịch sử.</p><button className="button primary full-width" onClick={startGame}>Thêm một ván <ArrowRight size={16} /></button><button className="text-button centered" onClick={() => { setModal(null); setGame(null); setPage('lobby'); }}>Về sảnh chờ</button></div>}
    </Modal>}
  </div>;
}
