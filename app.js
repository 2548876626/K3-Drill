// app.js for K3-Drill (V15 - Robust FingerprintJS init)

document.addEventListener('DOMContentLoaded', () => {
    
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
    const clearFavoritesBtn = document.getElementById('clear-favorites-btn');
    const clearMistakesBtn = document.getElementById('clear-mistakes-btn');
    const showSignQuestionsBtn = document.getElementById('show-sign-questions-btn');
    const allControlButtons = document.querySelectorAll('.header-controls button');

    const debounce = (func, delay) => { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; };
    const dispatchStateChange = () => document.dispatchEvent(new CustomEvent('appStateChanged'));
    
    let visitorIdPromise = null;
    const getVisitorId = async () => {
        if (typeof FingerprintJS === 'undefined') {
            showToast("游客身份模块加载失败，请检查网络或禁用广告拦截插件。");
            throw new Error('FingerprintJS library not loaded.');
        }
        if (!visitorIdPromise) {
            visitorIdPromise = (async () => {
                const fp = await FingerprintJS.load({ apiKey: "rzpS4ePUNfC2o2zT5PZ1" });
                const result = await fp.get();
                return result.visitorId;
            })();
        }
        return visitorIdPromise;
    };

    const setUser = async (user) => {
        appState.isDataLoaded = false;
        try {
            if (user) {
                if (user.token) {
                    appState.currentUser = user;
                } else if (user.isGuest) {
                    const guestId = await getVisitorId();
                    appState.currentUser = { sub: guestId, isGuest: true, token: null };
                }
                await fetchUserData();
            } else {
                appState.currentUser = null;
                appState.userData = { favorites: [], mistakes: [] };
            }
        } catch (error) {
            console.error("Error setting user:", error);
            appState.currentUser = null;
        } finally {
            appState.isDataLoaded = true;
            dispatchStateChange();
        }
    };

    const fetchUserData = async () => { if (!appState.currentUser) { appState.isDataLoaded = true; return; } try { const endpoint = appState.currentUser.isGuest ? `/api/user-data?id=${appState.currentUser.sub}` : '/api/user-data'; const headers = appState.currentUser.token ? { Authorization: `Bearer ${appState.currentUser.token.access_token}` } : {}; const response = await fetch(endpoint, { headers }); if (response.status === 404) { appState.userData = { favorites: [], mistakes: [] }; } else if (!response.ok) { throw new Error('Failed to fetch user data'); } else { appState.userData = await response.json() || { favorites: [], mistakes: [] }; } } catch (error) { console.error(error); showToast("同步用户数据失败！"); appState.userData = { favorites: [], mistakes: [] }; } };
    const saveUserData = async () => { if (!appState.currentUser) return; try { const endpoint = appState.currentUser.isGuest ? `/api/user-data?id=${appState.currentUser.sub}` : '/api/user-data'; const headers = { 'Content-Type': 'application/json', ...(appState.currentUser.token && { Authorization: `Bearer ${appState.currentUser.token.access_token}` }) }; await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(appState.userData) }); console.log("User data saved."); } catch (error) { console.error('Failed to save user data:', error); showToast("保存数据失败！"); } };
    const debouncedSaveUserData = debounce(saveUserData, 1500);
    const updateUIOnStateChange = () => { const guestWelcome = document.querySelector('.guest-welcome'); if (guestWelcome) guestWelcome.remove(); const user = appState.currentUser; const isLoggedIn = !!user; showFavoritesBtn.style.display = isLoggedIn ? 'inline-flex' : 'none'; clearFavoritesBtn.style.display = isLoggedIn ? 'inline-flex' : 'none'; showMistakesBtn.style.display = isLoggedIn ? 'inline-flex' : 'none'; clearMistakesBtn.style.display = isLoggedIn ? 'inline-flex' : 'none'; guestLoginBtn.style.display = isLoggedIn ? 'none' : 'inline-block'; identityMenu.style.display = 'block'; if (isLoggedIn && user.isGuest) { identityMenu.style.display = 'none'; const welcome = document.createElement('div'); welcome.className = 'guest-welcome'; welcome.innerHTML = `<span>游客模式</span> <button id="exit-guest-btn">退出</button>`; document.querySelector('.header-user-area').appendChild(welcome); } if (!isLoggedIn) resetOrder(); else renderQuestions(false); };
    const renderQuestions = (resetAll = true) => { if (resetAll) { appState.currentQuestions = [...appState.originalQuestions]; allControlButtons.forEach(btn => btn.classList.remove('active')); resetOrderBtn.classList.add('active'); practiceModeBtn.classList.add('active'); } questionArea.innerHTML = ''; appState.currentQuestions.forEach((q, index) => { const isFavorited = appState.isDataLoaded && appState.userData.favorites.includes(q.id); const isMulti = q.correctAnswer.includes('┋'); const inputType = isMulti ? 'checkbox' : 'radio'; const optionsHTML = q.options.map((opt, optIndex) => `<label class="option-item" for="q-${q.id}-opt-${optIndex}" data-option-char="${opt.charAt(0)}"><input type="${inputType}" id="q-${q.id}-opt-${optIndex}" name="q-${q.id}" value="${opt.charAt(0)}">${opt}</label>`).join(''); const questionDiv = document.createElement('div'); questionDiv.className = 'question-item'; questionDiv.id = `q-item-${q.id}`; questionDiv.dataset.questionId = q.id; questionDiv.innerHTML = `<div class="question-title"><span>${q.title}</span><button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-q-id="${q.id}" title="收藏/取消收藏">⭐</button></div><div class="question-image"><img src="${q.image}" alt="题目图片" loading="lazy"></div><div class="options-list">${optionsHTML}</div><div class="action-buttons"><button class="submit-btn">确定</button><button class="reveal-btn">查看答案</button></div><div class="answer-area"></div>`; questionArea.appendChild(questionDiv); }); showQuestion(resetAll ? 0 : appState.currentIndex); };
    const findQuestionData = (id) => appState.originalQuestions.find(q => q.id === id);
    const checkAnswer = (questionId) => { const questionData = findQuestionData(questionId); if (!questionData) return; const questionEl = document.getElementById(`q-item-${questionId}`); const answerArea = questionEl.querySelector('.answer-area'); const selectedValues = Array.from(questionEl.querySelectorAll('input:checked')).map(input => input.value).sort(); const correctValues = questionData.correctAnswer.split('┋').map(ans => ans.charAt(0)).sort(); const isCorrect = selectedValues.length === correctValues.length && selectedValues.every((v, i) => v === correctValues[i]); if (isCorrect) { answerArea.innerHTML = `<strong>回答正确！</strong>`; answerArea.className = 'answer-area correct'; answerArea.style.display = 'block'; setTimeout(() => { answerArea.style.display = 'none'; if (appState.currentIndex < appState.currentQuestions.length - 1) { showQuestion(appState.currentIndex + 1); } else { showToast("恭喜你，已经是最后一题了！"); } }, 500); } else { answerArea.innerHTML = `<strong>回答错误！</strong><br>正确答案：${questionData.correctAnswer}`; answerArea.className = 'answer-area incorrect'; answerArea.style.display = 'block'; if (appState.currentUser) { if (!appState.userData.mistakes.includes(questionData.id)) { appState.userData.mistakes.push(questionData.id); debouncedSaveUserData(); showToast("已加入错题本！"); } } } };
    const showQuestion = (index) => { if(index >= 0 && index < appState.currentQuestions.length) { appState.currentIndex = index; document.querySelectorAll('.question-item').forEach(item => { const qId = item.dataset.questionId; const currentQId = appState.currentQuestions[index]?.id; item.classList.toggle('active', qId === currentQId); }); counterEl.textContent = `${index + 1} / ${appState.currentQuestions.length}`; prevBtn.disabled = index === 0; nextBtn.disabled = index === appState.currentQuestions.length - 1; }};
    const revealAnswer = (questionId) => { const questionData = findQuestionData(questionId); if (!questionData) return; const questionEl = document.getElementById(`q-item-${questionId}`); const answerArea = questionEl.querySelector('.answer-area'); answerArea.innerHTML = `<strong>正确答案：</strong>${questionData.correctAnswer}`; answerArea.className = 'answer-area revealed'; };
    const setMode = (mode) => { appState.currentMode = mode; practiceModeBtn.classList.toggle('active', mode === 'practice'); reviewModeBtn.classList.toggle('active', mode === 'review'); footer.style.display = (mode === 'review') ? 'none' : 'flex'; document.querySelectorAll('.question-item').forEach(item => { const questionId = item.dataset.questionId; const questionData = findQuestionData(questionId); item.classList.toggle('active', mode === 'review' || item.id === `q-item-${appState.currentQuestions[appState.currentIndex]?.id}`); item.querySelector('.action-buttons').style.display = (mode === 'practice') ? 'flex' : 'none'; const answerArea = item.querySelector('.answer-area'); answerArea.className = 'answer-area'; if (questionData) { const correctValues = questionData.correctAnswer.split('┋').map(ans => ans.charAt(0)); item.querySelectorAll('.option-item').forEach(label => { const shouldHighlight = mode === 'review' && correctValues.includes(label.dataset.optionChar); label.classList.toggle('correct-highlight', shouldHighlight); if (mode === 'practice') label.classList.remove('selected'); }); } }); if (mode === 'practice') showQuestion(appState.currentIndex); };
    const shuffleQuestions = () => { document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); shuffleBtn.classList.add('active'); resetOrderBtn.classList.remove('active'); for (let i = appState.currentQuestions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[appState.currentQuestions[i], appState.currentQuestions[j]] = [appState.currentQuestions[j], appState.currentQuestions[i]]; } renderQuestions(false); setMode(appState.currentMode); showToast("题目顺序已打乱！"); };
    const resetOrder = () => { document.querySelectorAll('.filter-btn, #shuffle-btn').forEach(b => b.classList.remove('active')); resetOrderBtn.classList.add('active'); appState.currentQuestions = [...appState.originalQuestions]; renderQuestions(false); setMode(appState.currentMode); showToast("已恢复默认顺序！"); };
    const filterQuestions = (type) => { allControlButtons.forEach(btn => btn.classList.remove('active')); const targetBtn = {favorites: showFavoritesBtn, mistakes: showMistakesBtn, sign: showSignQuestionsBtn}[type]; if(targetBtn) targetBtn.classList.add('active'); practiceModeBtn.classList.add('active'); let filtered; if(type === 'sign') { filtered = appState.originalQuestions.filter(q => q.title.includes('标识')); } else { const idList = appState.userData[type]; if (!idList || idList.length === 0) { alert(`你的${type === 'favorites' ? '收藏夹' : '错题本'}是空的！`); resetOrder(); return; } filtered = appState.originalQuestions.filter(q => idList.includes(q.id)); } if (filtered.length === 0) { alert('没有找到相关题目！'); resetOrder(); return; } appState.currentQuestions = filtered; renderQuestions(false); setMode('practice'); };
    const clearUserData = (type) => { const typeName = type === 'favorites' ? '收藏夹' : '错题本'; if (!appState.currentUser) { alert(`请先登录或进入游客模式以管理${typeName}！`); return; } if (appState.userData[type].length === 0) { showToast(`${typeName}已经是空的了！`); return; } if (confirm(`确定要清空你的所有${typeName}吗？这个操作无法撤销。`)) { appState.userData[type] = []; debouncedSaveUserData(); showToast(`${typeName}已清空！`); const activeFilter = document.querySelector('.filter-btn.active'); if (activeFilter && activeFilter.id.includes(type)) { resetOrder(); } else { renderQuestions(false); } } };
    const getOrCreateGuestId = () => { let id = localStorage.getItem('k3_guest_id'); if (!id) { id = `guest_${Date.now()}`; localStorage.setItem('k3_guest_id', id); } return id; };
    const showToast = (message) => { let toast = document.querySelector('.toast-notification'); if (toast) toast.remove(); toast = document.createElement('div'); toast.className = 'toast-notification'; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.classList.add('show'), 10); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 2000); }, 2000); };
    const toastStyle = document.createElement('style'); toastStyle.textContent = `.toast-notification { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 25px; border-radius: 50px; background: linear-gradient(135deg, #1abc9c, #2ecc71); color: white; font-size: 16px; font-weight: 500; z-index: 10000; opacity: 0; transition: all 0.5s ease; box-shadow: 0 5px 15px rgba(0,0,0,0.2); } .toast-notification.show { opacity: 1; bottom: 50px; }`; document.head.appendChild(toastStyle);
    
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
        showSignQuestionsBtn.addEventListener('click', () => filterQuestions('sign'));
        guestLoginBtn.addEventListener('click', async () => { guestLoginBtn.disabled = true; guestLoginBtn.textContent = "正在生成身份..."; try { await setUser({ isGuest: true }); } catch (error) { showToast("无法进入游客模式，请稍后重试。"); } finally { guestLoginBtn.disabled = false; guestLoginBtn.textContent = "游客模式"; }});
        questionArea.addEventListener('click', e => { const questionItem = e.target.closest('.question-item'); if (!questionItem) return; const questionId = questionItem.dataset.questionId; if (e.target.classList.contains('favorite-btn')) { if (!appState.currentUser) { netlifyIdentity.open('login'); return; } if (!appState.isDataLoaded) { showToast("正在同步数据..."); return; } const isFavorited = e.target.classList.toggle('favorited'); const favIndex = appState.userData.favorites.indexOf(questionId); if (isFavorited) { if (favIndex === -1) appState.userData.favorites.push(questionId); } else { if (favIndex > -1) appState.userData.favorites.splice(favIndex, 1); } debouncedSaveUserData(); } if (appState.currentMode === 'practice') { if (e.target.classList.contains('submit-btn')) checkAnswer(questionId); if (e.target.classList.contains('reveal-btn')) revealAnswer(questionId); if (e.target.closest('.option-item')) { const label = e.target.closest('.option-item'); const input = label.querySelector('input'); if (input.type === 'radio') questionItem.querySelectorAll('.option-item').forEach(l => l.classList.remove('selected')); label.classList.toggle('selected', input.checked); } } });
        document.body.addEventListener('click', e => { if (e.target?.id === 'exit-guest-btn') { setUser(null); } });
    }
    
    function init() {
        setupEventListeners();
        netlifyIdentity.on('init', user => setUser(user));
        netlifyIdentity.on('login', user => { setUser(user); netlifyIdentity.close(); });
        netlifyIdentity.on('logout', () => setUser(null));
        netlifyIdentity.init();
    }
    init();
});