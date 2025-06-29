// app.js for K3-Drill (V11 - Final & Polished)

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State ---
    const appState = {
        originalQuestions: [...k3_questions].sort((a, b) => (a.title.match(/\*(\d+)/)?.[1] || 999) - (b.title.match(/\*(\d+)/)?.[1] || 999)),
        currentQuestions: [],
        currentIndex: 0,
        currentMode: 'practice',
        currentUser: null,
        userData: { favorites: [], mistakes: [] },
        isDataLoaded: false
    };
    appState.currentQuestions = [...appState.originalQuestions];

    // --- DOM Elements ---
    const questionArea = document.getElementById('question-area');
    const footer = document.querySelector('.app-footer');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counterEl = document.getElementById('counter');
    const practiceModeBtn = document.getElementById('practice-mode-btn');
    const reviewModeBtn = document.getElementById('review-mode-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const resetOrderBtn = document.getElementById('reset-order-btn');
    const showFavoritesBtn = document.getElementById('show-favorites-btn');
    const showMistakesBtn = document.getElementById('show-mistakes-btn');
    const guestLoginBtn = document.getElementById('guest-login-btn');
    const identityMenu = document.querySelector('[data-netlify-identity-menu]');
    const allControlButtons = document.querySelectorAll('.header-controls button');
    const clearFavoritesBtn = document.getElementById('clear-favorites-btn');
    const clearMistakesBtn = document.getElementById('clear-mistakes-btn');

    // --- Utility Functions ---
    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- State Management ---
    const dispatchStateChange = () => document.dispatchEvent(new CustomEvent('appStateChanged'));
    
    const setUser = async (user) => {
        appState.isDataLoaded = false;
        if (user) {
            appState.currentUser = user.token ? user : { sub: getOrCreateGuestId(), isGuest: true, token: null };
            await fetchUserData();
        } else {
            appState.currentUser = null;
            appState.userData = { favorites: [], mistakes: [] };
        }
        appState.isDataLoaded = true;
        dispatchStateChange();
    };

    // --- Backend API Functions ---
    const fetchUserData = async () => {
        if (!appState.currentUser) { appState.isDataLoaded = true; return; }
        try {
            const endpoint = appState.currentUser.isGuest ? `/api/user-data?id=${appState.currentUser.sub}` : '/api/user-data';
            const headers = appState.currentUser.token ? { Authorization: `Bearer ${appState.currentUser.token.access_token}` } : {};
            const response = await fetch(endpoint, { headers });
            if (response.status === 404) { appState.userData = { favorites: [], mistakes: [] }; }
            else if (!response.ok) { throw new Error('Failed to fetch user data'); }
            else { appState.userData = await response.json() || { favorites: [], mistakes: [] }; }
        } catch (error) {
            console.error(error);
            showToast("同步用户数据失败，请稍后刷新重试！");
            appState.userData = { favorites: [], mistakes: [] };
        }
    };

    const saveUserData = async () => {
        if (!appState.currentUser) return;
        try {
            const endpoint = appState.currentUser.isGuest ? `/api/user-data?id=${appState.currentUser.sub}` : '/api/user-data';
            const headers = { 'Content-Type': 'application/json', ...(appState.currentUser.token && { Authorization: `Bearer ${appState.currentUser.token.access_token}` }) };
            await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(appState.userData) });
            console.log("User data saved.");
        } catch (error) {
            console.error('Failed to save user data:', error);
            showToast("保存数据失败！");
        }
    };
    const debouncedSaveUserData = debounce(saveUserData, 1500); // 1.5秒防抖

    // --- UI Update Functions ---
    const updateUIOnStateChange = () => {
        const guestWelcome = document.querySelector('.guest-welcome');
        if (guestWelcome) guestWelcome.remove();
        const user = appState.currentUser;
        if (user) {
            identityMenu.style.display = user.token ? 'block' : 'none';
            guestLoginBtn.style.display = 'none';
            showFavoritesBtn.style.display = 'inline-flex';
            showMistakesBtn.style.display = 'inline-flex';
            clearFavoritesBtn.style.display = 'inline-flex';
            clearMistakesBtn.style.display = 'inline-flex';
            if (user.isGuest) {
                const welcome = document.createElement('div');
                welcome.className = 'guest-welcome';
                welcome.innerHTML = `<span>游客模式</span> <button id="exit-guest-btn">退出</button>`;
                identityMenu.parentNode.insertBefore(welcome, guestLoginBtn);
            }
        } else {
            identityMenu.style.display = 'block';
            guestLoginBtn.style.display = 'inline-block';
            showFavoritesBtn.style.display = 'none';
            showMistakesBtn.style.display = 'none';
            clearFavoritesBtn.style.display = 'none';
            clearMistakesBtn.style.display = 'none';
        }
        renderQuestions(false);
    };

    const renderQuestions = (resetAll = true) => {
        if (resetAll) {
            appState.currentQuestions = [...appState.originalQuestions];
            allControlButtons.forEach(btn => btn.classList.remove('active'));
            resetOrderBtn.classList.add('active');
            practiceModeBtn.classList.add('active');
        }
        questionArea.innerHTML = '';
        appState.currentQuestions.forEach((q, index) => {
            const isFavorited = appState.isDataLoaded && appState.userData.favorites.includes(q.questionNumber);
            const isMulti = q.correctAnswer.includes('┋');
            const inputType = isMulti ? 'checkbox' : 'radio';
            const optionsHTML = q.options.map(opt => `<label class="option-item" data-option-char="${opt.charAt(0)}"><input type="${inputType}" name="q${q.questionNumber}" value="${opt.charAt(0)}">${opt}</label>`).join('');
            
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.id = `q-${index}`;
            questionDiv.innerHTML = `
                <div class="question-title">
                    <span>${q.title}</span>
                    <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-q-num="${q.questionNumber}" title="收藏/取消收藏">⭐</button>
                </div>
                <div class="question-image"><img src="${q.image}" alt="题目图片" loading="lazy"></div>
                <div class="options-list">${optionsHTML}</div>
                <div class="action-buttons"><button class="submit-btn">确定</button><button class="reveal-btn">查看答案</button></div>
                <div class="answer-area"></div>`;
            questionArea.appendChild(questionDiv);
        });
        showQuestion(resetAll ? 0 : appState.currentIndex);
    };

    const checkAnswer = (index) => {
        const questionData = appState.currentQuestions[index];
        const questionEl = document.getElementById(`q-${index}`);
        const answerArea = questionEl.querySelector('.answer-area');
        const selectedValues = Array.from(questionEl.querySelectorAll('input:checked')).map(input => input.value).sort();
        const correctValues = questionData.correctAnswer.split('┋').map(ans => ans.charAt(0)).sort();
        const isCorrect = selectedValues.length === correctValues.length && selectedValues.every((v, i) => v === correctValues[i]);
        answerArea.innerHTML = `<strong>${isCorrect ? '回答正确！' : '回答错误！'}</strong><br>正确答案：${questionData.correctAnswer}`;
        answerArea.className = `answer-area ${isCorrect ? 'correct' : 'incorrect'}`;
        if (!isCorrect && appState.currentUser) {
            if (!appState.userData.mistakes.includes(questionData.questionNumber)) {
                appState.userData.mistakes.push(questionData.questionNumber);
                debouncedSaveUserData();
                showToast("已加入错题本！");
            }
        }
    };
    
    const showQuestion = (index) => {
        appState.currentIndex = index;
        document.querySelectorAll('.question-item').forEach((item, i) => item.classList.toggle('active', i === index));
        counterEl.textContent = `${index + 1} / ${appState.currentQuestions.length}`;
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === appState.currentQuestions.length - 1;
    };
    
    const revealAnswer = (index) => {
        const questionEl = document.getElementById(`q-${index}`);
        const answerArea = questionEl.querySelector('.answer-area');
        answerArea.innerHTML = `<strong>正确答案：</strong>${appState.currentQuestions[index].correctAnswer}`;
        answerArea.className = 'answer-area revealed';
    };

    const setMode = (mode) => {
        appState.currentMode = mode;
        practiceModeBtn.classList.toggle('active', mode === 'practice');
        reviewModeBtn.classList.toggle('active', mode === 'review');
        footer.style.display = (mode === 'review') ? 'none' : 'flex';
        document.querySelectorAll('.question-item').forEach((item, idx) => {
            item.classList.toggle('active', mode === 'review' || idx === appState.currentIndex);
            item.querySelector('.action-buttons').style.display = (mode === 'practice') ? 'flex' : 'none';
            const answerArea = item.querySelector('.answer-area');
            answerArea.className = 'answer-area';
            const correctValues = appState.currentQuestions[idx].correctAnswer.split('┋').map(ans => ans.charAt(0));
            item.querySelectorAll('.option-item').forEach(label => {
                const shouldHighlight = mode === 'review' && correctValues.includes(label.dataset.optionChar);
                label.classList.toggle('correct-highlight', shouldHighlight);
                if (mode === 'practice') label.classList.remove('selected');
            });
        });
        if (mode === 'practice') showQuestion(appState.currentIndex);
    };

    const shuffleQuestions = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        shuffleBtn.classList.add('active');
        resetOrderBtn.classList.remove('active');
        for (let i = appState.currentQuestions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[appState.currentQuestions[i], appState.currentQuestions[j]] = [appState.currentQuestions[j], appState.currentQuestions[i]]; }
        renderQuestions(false);
        setMode(appState.currentMode);
        showToast("题目顺序已打乱！");
    };

    const resetOrder = () => {
        document.querySelectorAll('.filter-btn, #shuffle-btn').forEach(b => b.classList.remove('active'));
        resetOrderBtn.classList.add('active');
        appState.currentQuestions = [...appState.originalQuestions];
        renderQuestions(false);
        setMode(appState.currentMode);
        showToast("已恢复默认顺序！");
    };

    const filterQuestions = (type) => {
        allControlButtons.forEach(btn => btn.classList.remove('active'));
        const targetBtn = type === 'favorites' ? showFavoritesBtn : showMistakesBtn;
        targetBtn.classList.add('active');
        practiceModeBtn.classList.add('active');
        const idList = appState.userData[type];
        if (!idList || idList.length === 0) {
            alert(`你的${type === 'favorites' ? '收藏夹' : '错题本'}是空的！`);
            resetOrder();
            return;
        }
        appState.currentQuestions = appState.originalQuestions.filter(q => idList.includes(q.questionNumber));
        renderQuestions(false);
        setMode('practice');
        const clearUserData = (type) => {
            const typeName = type === 'favorites' ? '收藏夹' : '错题本';
            if (!appState.currentUser) {
                alert(`请先登录或进入游客模式以管理${typeName}！`);
                return;
            }
        
            if (appState.userData[type].length === 0) {
                showToast(`${typeName}已经是空的了！`);
                return;
            }
        
            if (confirm(`确定要清空你的所有${typeName}吗？这个操作无法撤销。`)) {
                appState.userData[type] = [];
                debouncedSaveUserData(); // 使用已有的防抖保存函数
                showToast(`${typeName}已清空！`);
                
                const activeFilter = document.querySelector('.filter-btn.active');
                if (activeFilter && activeFilter.id.includes(type)) {
                    resetOrder();
                } else {
                    renderQuestions(false);
                }
            }
        };
    };

    const getOrCreateGuestId = () => { let id = localStorage.getItem('k3_guest_id'); if (!id) { id = `guest_${Date.now()}`; localStorage.setItem('k3_guest_id', id); } return id; };

    const showToast = (message) => {
        let toast = document.querySelector('.toast-notification');
        if (toast) toast.remove();
        toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 2000);
    };

    const toastStyle = document.createElement('style');
    toastStyle.textContent = `.toast-notification { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 25px; border-radius: 50px; background: linear-gradient(135deg, #1abc9c, #2ecc71); color: white; font-size: 16px; font-weight: 500; z-index: 10000; opacity: 0; transition: all 0.5s ease; box-shadow: 0 5px 15px rgba(0,0,0,0.2); } .toast-notification.show { opacity: 1; bottom: 50px; }`;
    document.head.appendChild(toastStyle);
    
    function setupEventListeners() {
        document.addEventListener('appStateChanged', updateUIOnStateChange);
        prevBtn.addEventListener('click', () => showQuestion(appState.currentIndex - 1));
        nextBtn.addEventListener('click', () => showQuestion(appState.currentIndex + 1));
        practiceModeBtn.addEventListener('click', () => setMode('practice'));
        reviewModeBtn.addEventListener('click', () => setMode('review'));
        shuffleBtn.addEventListener('click', shuffleQuestions);
        resetOrderBtn.addEventListener('click', resetOrder);
        showFavoritesBtn.addEventListener('click', () => filterQuestions('favorites'));
        showMistakesBtn.addEventListener('click', () => filterQuestions('mistakes'));
        clearFavoritesBtn.addEventListener('click', () => clearUserData('favorites'));
        clearMistakesBtn.addEventListener('click', () => clearUserData('mistakes'));

        questionArea.addEventListener('click', e => {
            if (e.target.classList.contains('favorite-btn')) {
                if (!appState.currentUser) { netlifyIdentity.open('login'); return; }
                if (!appState.isDataLoaded) { showToast("正在同步数据..."); return; }
                const qNum = parseInt(e.target.dataset.qNum);
                const isFavorited = e.target.classList.toggle('favorited');
                const favIndex = appState.userData.favorites.indexOf(qNum);
                if (isFavorited) {
                    if (favIndex === -1) appState.userData.favorites.push(qNum);
                } else {
                    if (favIndex > -1) appState.userData.favorites.splice(favIndex, 1);
                }
                debouncedSaveUserData();
            }
            if (appState.currentMode === 'practice') {
                const item = e.target.closest('.question-item');
                if (!item) return;
                const index = parseInt(item.id.split('-')[1]);
                if (e.target.classList.contains('submit-btn')) checkAnswer(index);
                if (e.target.classList.contains('reveal-btn')) revealAnswer(index);
                if (e.target.closest('.option-item')) {
                    const label = e.target.closest('.option-item');
                    const input = label.querySelector('input');
                    if (input.type === 'radio') item.querySelectorAll('.option-item').forEach(l => l.classList.remove('selected'));
                    label.classList.toggle('selected', input.checked);
                }
            }
        });
        
        netlifyIdentity.on('init', user => setUser(user));
        netlifyIdentity.on('login', user => { setUser(user); netlifyIdentity.close(); });
        netlifyIdentity.on('logout', () => { setUser(null); });
        guestLoginBtn.addEventListener('click', () => setUser({ isGuest: true }));
        document.body.addEventListener('click', e => { if (e.target?.id === 'exit-guest-btn') { localStorage.removeItem('k3_guest_id'); setUser(null); } });
    }

    function init() {
        setupEventListeners();
        initNetlifyIdentity(); // Call this instead of direct on('init')
    }
    
    // Encapsulate Netlify Identity initialization
    function initNetlifyIdentity() {
        const user = netlifyIdentity.currentUser();
        // Handle guest user state on initial load if no user is logged in
        if (!user && localStorage.getItem('k3_guest_id')) {
            setUser({ isGuest: true, id: localStorage.getItem('k3_guest_id') });
        } else {
            setUser(user);
        }
    }

    init();
});