// app.js for K3-Drill (V7 - with Favorites & Mistakes)

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State ---
    const originalQuestions = [...k3_questions].sort((a, b) => (a.title.match(/\*(\d+)/)?.[1] || 999) - (b.title.match(/\*(\d+)/)?.[1] || 999));
    let currentQuestions = [...originalQuestions];
    let currentIndex = 0;
    let currentMode = 'practice';
    let currentUser = null;
    let userData = { favorites: [], mistakes: [] }; // 用户数据
    let isDataLoaded = false; // 新增：跟踪用户数据是否已从服务器加载

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
    const allControls = document.querySelectorAll('.header-controls .mode-btn, .header-controls .filter-btn');
    const guestLoginBtn = document.getElementById('guest-login-btn');
    const identityMenu = document.querySelector('[data-netlify-identity-menu]');

    // --- Backend API Functions ---
    const fetchUserData = async () => {
        if (!netlifyIdentity.currentUser()) return;
        isDataLoaded = false; // 设置数据加载状态为未完成
        try {
            const response = await fetch('/api/user-data', {
                headers: { Authorization: `Bearer ${netlifyIdentity.currentUser().token.access_token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch user data');
            userData = await response.json();
            console.log("User data loaded:", userData);
            renderQuestions(); // Re-render to show favorite status
        } catch (error) {
            console.error(error);
        } finally {
            isDataLoaded = true; // 无论成功或失败，都标记数据加载过程已完成
        }
    };

    const saveUserData = async () => {
        if (!netlifyIdentity.currentUser()) return;
        try {
            await fetch('/api/user-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${netlifyIdentity.currentUser().token.access_token}`
                },
                body: JSON.stringify(userData)
            });
            console.log("User data saved:", userData);
        } catch (error) {
            console.error('Failed to save user data:', error);
        }
    };

    // --- User & Guest State Management ---
    // Function to get or create a guest ID
    const getOrCreateGuestId = () => {
        let guestId = localStorage.getItem('k3_guest_id');
        if (!guestId) {
            guestId = 'guest_' + new Date().getTime() + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('k3_guest_id', guestId);
        }
        return guestId;
    };

    // Function to update the UI based on user state
    const updateUserState = (user) => {
        if (user && user.token) { // Logged-in Netlify user
            currentUser = user;
            guestLoginBtn.style.display = 'none'; // Hide guest button
            console.log('Logged in as:', user.email);
            // 登录后，获取用户数据
            fetchUserData();
            // 显示筛选按钮
            if (showFavoritesBtn) showFavoritesBtn.style.display = 'inline-block';
            if (showMistakesBtn) showMistakesBtn.style.display = 'inline-block';
        } else if (user && user.isGuest) { // Guest user
            currentUser = { sub: user.id, isGuest: true };
            identityMenu.style.display = 'none'; // Hide Netlify login/logout
            guestLoginBtn.style.display = 'none'; // Hide guest button after "login"
            // Create a fake welcome message for guest
            const guestWelcome = document.createElement('div');
            guestWelcome.className = 'guest-welcome';
            guestWelcome.innerHTML = `<span>欢迎, 游客 (ID: ${user.id.substring(0, 12)}...)</span> <button id="exit-guest-btn">退出游客模式</button>`;
            identityMenu.parentNode.insertBefore(guestWelcome, identityMenu.nextSibling);
            console.log('Entered Guest Mode with ID:', user.id);
            // 显示筛选按钮
            if (showFavoritesBtn) showFavoritesBtn.style.display = 'inline-block';
            if (showMistakesBtn) showMistakesBtn.style.display = 'inline-block';
            // 尝试从localStorage加载游客数据
            isDataLoaded = false; // 设置数据加载状态为未完成
            try {
                const savedData = localStorage.getItem(`k3_guest_data_${user.id}`);
                if (savedData) {
                    userData = JSON.parse(savedData);
                    renderQuestions(); // 重新渲染以显示收藏状态
                }
            } catch (error) {
                console.error('Failed to load guest data:', error);
            } finally {
                isDataLoaded = true; // 无论成功或失败，都标记数据加载过程已完成
            }
        } else { // Not logged in, not a guest
            currentUser = null;
            isDataLoaded = false; // 重置数据加载状态
            guestLoginBtn.style.display = 'inline-block'; // Show guest button
            console.log('No user logged in. Offering guest mode.');
            // 登出后重置状态
            userData = { favorites: [], mistakes: [] };
            if (showFavoritesBtn) showFavoritesBtn.style.display = 'none';
            if (showMistakesBtn) showMistakesBtn.style.display = 'none';
            currentQuestions = [...originalQuestions];
            renderQuestions();
        }
    };
    
    // --- 核心功能函数 ---
    const renderQuestions = () => {
        questionArea.innerHTML = '';
        currentQuestions.forEach((q, index) => {
            const isMulti = q.correctAnswer.includes('┋');
            const inputType = isMulti ? 'checkbox' : 'radio';
            const isFavorited = isDataLoaded && userData.favorites.includes(q.questionNumber);
            const isMistake = isDataLoaded && userData.mistakes.includes(q.questionNumber);

            const optionsHTML = q.options.map((opt, i) => {
                const optionChar = opt.charAt(0);
                return `
                <label class="option-item" for="q${q.questionNumber}-opt${i}" data-option-char="${optionChar}">
                    <input type="${inputType}" id="q${q.questionNumber}-opt${i}" name="q${q.questionNumber}" value="${optionChar}">
                    ${opt}
                </label>
            `}).join('');

            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.id = `q-${index}`;
            questionDiv.dataset.questionNumber = q.questionNumber; // 存储问题编号
            questionDiv.innerHTML = `
                <div class="question-title">
                    <span>${q.title}</span>
                    <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-q-num="${q.questionNumber}" title="收藏/取消收藏">⭐</button>
                </div>
                <div class="question-image"><img src="${q.image}" alt="题目图片" loading="lazy"></div>
                <div class="options-list">${optionsHTML}</div>
                <div class="action-buttons">
                    <button class="submit-btn">确定</button>
                    <button class="reveal-btn">查看答案</button>
                </div>
                <div class="answer-area"></div>
            `;
            questionArea.appendChild(questionDiv);
        });
    };

    const showQuestion = (index) => {
        currentIndex = index;
        document.querySelectorAll('.question-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        counterEl.textContent = `${index + 1} / ${currentQuestions.length}`;
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === currentQuestions.length - 1;
    };
    
    const checkAnswer = (index) => {
        const questionData = currentQuestions[index];
        const questionEl = document.getElementById(`q-${index}`);
        const answerArea = questionEl.querySelector('.answer-area');
        
        const selectedValues = Array.from(questionEl.querySelectorAll('input:checked')).map(input => input.value).sort();
        const correctValues = questionData.correctAnswer.split('┋').map(ans => ans.charAt(0)).sort();
        
        const isCorrect = selectedValues.length === correctValues.length && selectedValues.every((v, i) => v === correctValues[i]);

        if (!isCorrect && currentUser && isDataLoaded) {
            // 自动记录错题
            if (!userData.mistakes.includes(questionData.questionNumber)) {
                userData.mistakes.push(questionData.questionNumber);
                if (currentUser.isGuest) {
                    // 保存到localStorage
                    localStorage.setItem(`k3_guest_data_${currentUser.sub}`, JSON.stringify(userData));
                } else {
                    saveUserData(); // 异步保存到服务器
                }
                showToast("已加入错题本！");
            }
        }

        answerArea.innerHTML = `<strong>${isCorrect ? '回答正确！' : '回答错误！'}</strong><br>正确答案：${questionData.correctAnswer}`;
        answerArea.className = `answer-area ${isCorrect ? 'correct' : 'incorrect'}`;
    };

    const revealAnswer = (index) => {
        const questionEl = document.getElementById(`q-${index}`);
        const answerArea = questionEl.querySelector('.answer-area');
        answerArea.innerHTML = `<strong>正确答案：</strong>${currentQuestions[index].correctAnswer}`;
        answerArea.className = 'answer-area revealed';
    };

    const setMode = (mode) => {
        currentMode = mode;
        practiceModeBtn.classList.toggle('active', mode === 'practice');
        reviewModeBtn.classList.toggle('active', mode === 'review');
        footer.style.display = (mode === 'review') ? 'none' : 'flex';

        document.querySelectorAll('.question-item').forEach((item, idx) => {
            item.classList.toggle('active', mode === 'review' || idx === currentIndex);
            item.querySelector('.action-buttons').style.display = (mode === 'practice') ? 'flex' : 'none';
            
            const answerArea = item.querySelector('.answer-area');
            answerArea.className = 'answer-area';
            
            const correctValues = currentQuestions[idx].correctAnswer.split('┋').map(ans => ans.charAt(0));
            item.querySelectorAll('.option-item').forEach(label => {
                const optionChar = label.dataset.optionChar;
                const shouldHighlight = mode === 'review' && correctValues.includes(optionChar);
                label.classList.toggle('correct-highlight', shouldHighlight);
                if (mode === 'practice') {
                    label.classList.remove('selected');
                }
            });
        });
        
        if (mode === 'practice') {
            showQuestion(currentIndex);
        }
    };

    // --- 排序功能 (已升级) ---
    const shuffleQuestions = () => {
        if (allControls) {
            allControls.forEach(btn => btn.classList.remove('active'));
        }
        shuffleBtn.classList.add('active');
        for (let i = currentQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentQuestions[i], currentQuestions[j]] = [currentQuestions[j], currentQuestions[i]];
        }
        renderQuestions();
        showQuestion(0);
        setMode(currentMode); // 关键：保持当前模式
        showToast("题目顺序已打乱！");
    };

    const resetOrder = () => {
        if (allControls) {
            allControls.forEach(btn => btn.classList.remove('active'));
        }
        resetOrderBtn.classList.add('active');
        currentQuestions = [...originalQuestions];
        renderQuestions();
        showQuestion(0);
        setMode(currentMode); // 关键：保持当前模式
        showToast("已恢复默认顺序！");
    };

    // --- 新增：题目筛选逻辑 ---
    const filterQuestions = (type) => {
        if (allControls) {
            allControls.forEach(btn => btn.classList.remove('active'));
        }
        if (type === 'favorites' && showFavoritesBtn) showFavoritesBtn.classList.add('active');
        if (type === 'mistakes' && showMistakesBtn) showMistakesBtn.classList.add('active');

        const idList = userData[type];
        if (idList.length === 0) {
            alert(`你的${type === 'favorites' ? '收藏夹' : '错题本'}是空的！`);
            return;
        }
        currentQuestions = originalQuestions.filter(q => idList.includes(q.questionNumber));
        renderQuestions();
        showQuestion(0);
        showToast(`已显示${type === 'favorites' ? '收藏' : '错题'}列表！`);
    };

    function setupEventListeners() {
        prevBtn.addEventListener('click', () => showQuestion(currentIndex - 1));
        nextBtn.addEventListener('click', () => showQuestion(currentIndex + 1));
        practiceModeBtn.addEventListener('click', () => setMode('practice'));
        reviewModeBtn.addEventListener('click', () => setMode('review'));
        shuffleBtn.addEventListener('click', shuffleQuestions);
        resetOrderBtn.addEventListener('click', resetOrder);
        
        if (showFavoritesBtn) showFavoritesBtn.addEventListener('click', () => filterQuestions('favorites'));
        if (showMistakesBtn) showMistakesBtn.addEventListener('click', () => filterQuestions('mistakes'));

        questionArea.addEventListener('click', (e) => {
            const questionItem = e.target.closest('.question-item');
            if (!questionItem) return;
            const indexInCurrentArray = parseInt(questionItem.id.split('-')[1]);
            
            // 处理收藏按钮点击
            if (e.target.classList.contains('favorite-btn')) {
                if (!currentUser) {
                    alert('请先登录或进入游客模式以使用收藏功能！');
                    netlifyIdentity.open();
                    return;
                }
                
                if (!isDataLoaded) {
                    showToast("正在同步用户数据，请稍候...");
                    return;
                }
                
                const qNum = parseInt(e.target.dataset.qNum);
                e.target.classList.toggle('favorited');
                const favIndex = userData.favorites.indexOf(qNum);
                if (favIndex > -1) {
                    userData.favorites.splice(favIndex, 1); // 取消收藏
                    showToast('已取消收藏！');
                } else {
                    userData.favorites.push(qNum); // 添加收藏
                    showToast('已添加到收藏！');
                }
                
                if (currentUser.isGuest) {
                    // 保存到localStorage
                    localStorage.setItem(`k3_guest_data_${currentUser.sub}`, JSON.stringify(userData));
                } else {
                    saveUserData(); // 异步保存到服务器
                }
                return;
            }
            
            if (currentMode === 'practice') {
                if (e.target.classList.contains('submit-btn')) checkAnswer(indexInCurrentArray);
                if (e.target.classList.contains('reveal-btn')) revealAnswer(indexInCurrentArray);
                if (e.target.closest('.option-item')) {
                    const label = e.target.closest('.option-item');
                    const input = label.querySelector('input');
                    if(input.type === 'radio') questionItem.querySelectorAll('.option-item').forEach(l => l.classList.remove('selected'));
                    label.classList.toggle('selected', input.checked);
                }
            }
        });
    }
    
    function showToast(message) {
        let toast = document.querySelector('.toast-notification');
        if (toast) toast.remove();
        toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 2000);
    }

    const toastStyle = document.createElement('style');
    toastStyle.textContent = `.toast-notification { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 25px; border-radius: 50px; background: linear-gradient(135deg, #1abc9c, #2ecc71); color: white; font-size: 16px; font-weight: 500; z-index: 10000; opacity: 0; transition: all 0.5s ease; box-shadow: 0 5px 15px rgba(0,0,0,0.2); } .toast-notification.show { opacity: 1; bottom: 50px; }`;
    document.head.appendChild(toastStyle);

    function init() {
        // 初始隐藏筛选按钮，只有登录后才显示
        if (showFavoritesBtn) showFavoritesBtn.style.display = 'none';
        if (showMistakesBtn) showMistakesBtn.style.display = 'none';
        
        // 设置Netlify Identity事件监听器
        netlifyIdentity.on('init', user => updateUserState(user));
        netlifyIdentity.on('login', user => updateUserState(user));
        netlifyIdentity.on('logout', () => {
            // Clear guest welcome message if it exists
            const guestWelcome = document.querySelector('.guest-welcome');
            if (guestWelcome) guestWelcome.remove();
            identityMenu.style.display = 'block'; // Show Netlify login
            updateUserState(null);
        });

        // 设置游客登录按钮事件监听器
        guestLoginBtn.addEventListener('click', () => {
            const guestId = getOrCreateGuestId();
            updateUserState({ id: guestId, isGuest: true });
        });

        // 设置退出游客模式事件监听器
        document.body.addEventListener('click', e => {
            if (e.target && e.target.id === 'exit-guest-btn') {
                const guestWelcome = document.querySelector('.guest-welcome');
                if (guestWelcome) guestWelcome.remove();
                identityMenu.style.display = 'block';
                updateUserState(null);
            }
        });
        
        renderQuestions();
        showQuestion(0);
        setMode('practice');
        resetOrderBtn.classList.add('active');
        setupEventListeners();
    }

    init();
});