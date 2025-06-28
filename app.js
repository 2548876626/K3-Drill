// app.js for K3-Drill (V6 - Smart Sort & State Persistence)

document.addEventListener('DOMContentLoaded', () => {
    // 添加Netlify Identity用户登录状态检查
    const mainArea = document.querySelector('.app-main');
    const footerArea = document.querySelector('.app-footer');

    netlifyIdentity.on('init', user => {
        if (user) {
            // 用户已登录
            mainArea.classList.add('logged-in');
            footerArea.classList.add('logged-in');
            // 可以显示欢迎信息
            console.log('Welcome', user.user_metadata.full_name);
        }
    });

    netlifyIdentity.on('login', user => {
        mainArea.classList.add('logged-in');
        footerArea.classList.add('logged-in');
        netlifyIdentity.close(); // 登录后关闭模态框
    });

    netlifyIdentity.on('logout', () => {
        mainArea.classList.remove('logged-in');
        footerArea.classList.remove('logged-in');
    });
    
    // --- 智能排序与状态初始化 ---
    const extractQuestionNumber = (title) => {
        const match = title.match(/\*(\d+)/);
        return match ? parseInt(match[1]) : 999; // 如果没有题号，放到最后
    };

    const originalQuestions = [...k3_questions].sort((a, b) => {
        const numA = extractQuestionNumber(a.title);
        const numB = extractQuestionNumber(b.title);
        return numA - numB;
    });
    
    let currentQuestions = [...originalQuestions];
    let currentIndex = 0;
    let currentMode = 'practice';

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

    // --- 核心功能函数 ---
    const renderQuestions = () => {
        questionArea.innerHTML = '';
        currentQuestions.forEach((q, index) => {
            const isMulti = q.correctAnswer.includes('┋');
            const inputType = isMulti ? 'checkbox' : 'radio';

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
            questionDiv.innerHTML = `
                <div class="question-title">${q.title}</div>
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
        shuffleBtn.classList.add('active');
        resetOrderBtn.classList.remove('active');
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
        resetOrderBtn.classList.add('active');
        shuffleBtn.classList.remove('active');
        currentQuestions = [...originalQuestions];
        renderQuestions();
        showQuestion(0);
        setMode(currentMode); // 关键：保持当前模式
        showToast("已恢复默认顺序！");
    };

    function setupEventListeners() {
        prevBtn.addEventListener('click', () => showQuestion(currentIndex - 1));
        nextBtn.addEventListener('click', () => showQuestion(currentIndex + 1));
        practiceModeBtn.addEventListener('click', () => setMode('practice'));
        reviewModeBtn.addEventListener('click', () => setMode('review'));
        shuffleBtn.addEventListener('click', shuffleQuestions);
        resetOrderBtn.addEventListener('click', resetOrder);

        questionArea.addEventListener('click', (e) => {
            const questionItem = e.target.closest('.question-item');
            if (!questionItem) return;
            const indexInCurrentArray = parseInt(questionItem.id.split('-')[1]);
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
        renderQuestions();
        showQuestion(0);
        setMode('practice');
        resetOrderBtn.classList.add('active');
        setupEventListeners();
    }

    init();
});