/* ==========================================
   헤레디움(Heredium) 공식 스크립트 (JSON 기반 동적 리팩토링 버전)
   인터랙티브 기능: 동적 데이터 패치 및 렌더링, 모달 팝업, 타자기 효과, 탭 전환, 스크롤 애니메이션
   ========================================== */

// 로마자 숫자 맵 (부서 번호용)
const ROMAN_NUMS = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ"];

// SVG 아바타 메쉬 사전
const AVATAR_SVGS = {
    elf: `
        <svg viewBox="0 0 100 100" class="holo-svg">
            <path d="M50 15 C35 30 35 60 50 85 C65 60 65 30 50 15 Z" fill="none" stroke="currentColor" stroke-width="2" class="pulse-line"/>
            <path d="M32 35 C20 40 18 55 35 50" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M68 35 C80 40 82 55 65 50" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <line x1="50" y1="15" x2="50" y2="85" stroke="currentColor" stroke-dasharray="2,2"/>
            <circle cx="50" cy="45" r="3" fill="currentColor"/>
        </svg>
    `,
    beast: `
        <svg viewBox="0 0 100 100" class="holo-svg">
            <rect x="25" y="25" width="50" height="50" fill="none" stroke="currentColor" stroke-width="2" class="pulse-line"/>
            <line x1="25" y1="25" x2="75" y2="75" stroke="currentColor" stroke-width="1.5"/>
            <line x1="75" y1="25" x2="25" y2="75" stroke="currentColor" stroke-width="1.5"/>
            <path d="M50 10 L90 50 L50 90 L10 50 Z" fill="none" stroke="currentColor" stroke-width="1"/>
        </svg>
    `,
    dragon: `
        <svg viewBox="0 0 100 100" class="holo-svg">
            <polygon points="50,5 95,45 80,90 20,90 5,45" fill="none" stroke="currentColor" stroke-width="2" class="pulse-line"/>
            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5,5"/>
            <path d="M50 25 L50 75" stroke="currentColor" stroke-width="2"/>
        </svg>
    `
};

// BGM 파일들은 아래에서 import.meta.glob를 통해 동적으로 가져옵니다.
import sectorsData from '../../data/sectors.json';
import specimensData from '../../data/specimens.json';

// URL 경로에서 파일명(Vite 해시 및 확장자 제거)을 동적으로 추출하는 유틸리티 함수
function getTrackNameFromUrl(url) {
    try {
        const decodedUrl = decodeURIComponent(url);
        // 경로의 마지막 슬래시 뒤 파일명 추출
        const filename = decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1);
        // 확장자 분리 제거
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        // Vite 빌드 시 붙는 해시 코드(-[8자리]) 제거 (예: sample_1-C_lyCSBp -> sample_1)
        const cleanName = nameWithoutExt.replace(/-[a-zA-Z0-9_-]{8}$/, "");
        return cleanName;
    } catch (e) {
        return "Unknown Track";
    }
}

// JSON 내부의 이미지 경로를 Vite 번들러가 추적 가능하도록 URL을 생성해주는 동적 헬퍼 함수
function getAssetUrl(relativePath) {
    if (!relativePath) return "";
    return new URL(`../images/${relativePath}`, import.meta.url).href;
}

// 1. BGM 플레이리스트 정의 (import.meta.glob를 사용하여 sound 폴더 내 모든 mp3 파일을 동적 로드)
const bgmFiles = import.meta.glob('../sound/*.mp3', { eager: true });
const BGM_PLAYLIST = Object.entries(bgmFiles).map(([path, module]) => {
    const url = module.default;
    return {
        name: getTrackNameFromUrl(url),
        url: url
    };
});

// 2. 앱 초기화 (데이터 로딩 및 바인딩)
document.addEventListener("DOMContentLoaded", () => {
    try {
        // 화면 렌더링 시작 (Vite의 JSON 정적 임포트에 힘입어 비동기 fetch 없이 즉시 구동)
        renderSectors(sectorsData);
        renderSpecimens(specimensData);

        // 동적 렌더링 이후 인터랙션 요소들 활성화
        initScrollObserver();
        initEmblemGlitch();
        initBgmPlayer();
        initGnbToggle();

    } catch (error) {
        console.error("System Initialization Failed:", error);
        const grid = document.getElementById('sectors-grid');
        if (grid) {
            grid.innerHTML = `<div class="error-msg">▲ 시스템 오류: 데이터를 복구할 수 없습니다. (${error.message})</div>`;
        }
    }
});

// 2. 8대 부서(Sectors) 카드 동적 렌더링 및 모달 바인딩
function renderSectors(sectors) {
    const sectorsGrid = document.getElementById('sectors-grid');
    if (!sectorsGrid) return;

    sectorsGrid.innerHTML = "";

    // 1부터 8까지 키를 순회하며 렌더링
    Object.keys(sectors).forEach(key => {
        const sector = sectors[key];
        const romanNum = ROMAN_NUMS[parseInt(key) - 1] || key;
        const imgNum = String(key).padStart(2, '0');
        const bgImgUrl = getAssetUrl(`sectors/${imgNum}.jpg`);

        const cardHTML = `
            <div class="sector-card glass-panel interactive-card fade-in" data-sector="${key}">
                <div class="sector-card-bg" style="background-image: url('${bgImgUrl}');"></div>
                <div class="sector-num">${romanNum}</div>
                <h3 class="sector-name">${sector.title.split(' (')[0]}</h3>
                <p class="sector-summary">${sector.purpose}</p>
                <span class="read-more">기록 열람</span>
            </div>
        `;
        sectorsGrid.insertAdjacentHTML('beforeend', cardHTML);
    });

    // 카드 모달 팝업 이벤트 바인딩
    const modal = document.getElementById('sector-modal');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalDeptCode = document.getElementById('modal-dept-code');
    const modalTitle = document.getElementById('modal-sector-title');
    const modalPurpose = document.getElementById('modal-purpose');
    const modalTargets = document.getElementById('modal-targets');
    const modalDesc = document.getElementById('modal-description');

    let typingTimer = null;

    function typeText(element, text, speed = 12) {
        element.textContent = "";
        let i = 0;
        clearInterval(typingTimer);
        
        typingTimer = setInterval(() => {
            if (i < text.length) {
                element.textContent = text.substring(0, i + 1) + "_";
                i++;
            } else {
                element.textContent = text;
                clearInterval(typingTimer);
            }
        }, speed);
    }

    document.querySelectorAll('.interactive-card').forEach(card => {
        card.addEventListener('click', () => {
            const sectorNum = card.getAttribute('data-sector');
            const data = sectors[sectorNum];
            
            if (data) {
                modalDeptCode.textContent = `DEPT_REGISTRY // SECTOR_0${sectorNum}`;
                modalTitle.innerHTML = data.title.replace(' (', '<br>(');
                modalPurpose.textContent = data.purpose;
                modalTargets.textContent = data.targets;
                
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                typeText(modalDesc, data.description, 12);
            }
        });
    });

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        clearInterval(typingTimer);
    }

    modalCloseBtn.addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// 3. 실험체 아카이브(Specimen) 동적 렌더링 및 탭 전환 바인딩
function renderSpecimens(specimens) {
    const tabContainer = document.getElementById('specimen-tabs');
    const displayContainer = document.getElementById('specimen-display');

    if (!tabContainer || !displayContainer) return;

    tabContainer.innerHTML = "";
    displayContainer.innerHTML = "";

    specimens.forEach((specimen, index) => {
        const isActive = index === 0;
        const activeClass = isActive ? "active" : "";

        // 탭 버튼 추가
        const tabBtnHTML = `
            <button class="tab-btn ${activeClass}" data-tab="${specimen.id}">${specimen.tabName}</button>
        `;
        tabContainer.insertAdjacentHTML('beforeend', tabBtnHTML);

        // 아바타 콘텐츠 구성 (이미지가 등록되어 있으면 이미지를 사용하고, 없으면 기존 기하학 메쉬 사용)
        let avatarContent = "";
        if (specimen.image) {
            avatarContent = `<img src="${getAssetUrl(specimen.image)}" class="holo-avatar-img" alt="${specimen.name}">`;
        } else {
            const avatarMesh = AVATAR_SVGS[specimen.avatarType] || "";
            avatarContent = `
                <div class="holo-avatar-mesh ${specimen.avatarType}-mesh">
                    ${avatarMesh}
                </div>
            `;
        }

        // 상세 프로필 추가
        const profileHTML = `
            <div class="specimen-profile ${activeClass}" id="specimen-${specimen.id}">
                <div class="profile-layout">
                    <div class="hologram-viewport">
                        <div class="hologram-effect">
                            <div class="holo-grid"></div>
                            ${avatarContent}
                        </div>
                        <div class="holo-status">${specimen.statusMsg}</div>
                    </div>
                    <div class="specimen-details">
                        <div class="specimen-header">
                            <span class="specimen-number">${specimen.code}</span>
                            <h3 class="specimen-name">이름 : ${specimen.name}</h3>
                            <span class="specimen-race">종족 : ${specimen.race}</span>
                        </div>
                        <div class="specimen-stats">
                            <div class="stat-row"><span class="stat-label">관리 부서:</span> <span class="stat-val">${specimen.dept}</span></div>
                            <div class="stat-row"><span class="stat-label">신체 조건:</span> <span class="stat-val">${specimen.condition}</span></div>
                            <div class="stat-row"><span class="stat-label">특징:</span> <span class="stat-val">${specimen.feature}</span></div>
                            <div class="stat-row"><span class="stat-label">신분:</span> <span class="stat-val">${specimen.status}</span></div>
                        </div>
                        <div class="specimen-summary">
                            <h4>제국 공식 관리 의견서</h4>
                            <p>${specimen.opinion}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        displayContainer.insertAdjacentHTML('beforeend', profileHTML);
    });

    // 탭 버튼 전환 이벤트 바인딩
    const tabButtons = tabContainer.querySelectorAll('.tab-btn');
    const profiles = displayContainer.querySelectorAll('.specimen-profile');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            profiles.forEach(profile => profile.classList.remove('active'));
            const targetProfile = document.getElementById(`specimen-${tabId}`);
            if (targetProfile) {
                targetProfile.classList.add('active');
            }
        });
    });
}

// 4. 스크롤 페이드인 관찰기 초기화
function initScrollObserver() {
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px"
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(element => {
        scrollObserver.observe(element);
    });
}

// 5. 문장 및 타이틀 마우스 오버 글리치 효과
function initEmblemGlitch() {
    const emblem = document.getElementById('emblem');
    const mainTitle = document.getElementById('main-title');

    if (emblem && mainTitle) {
        const startGlitch = () => {
            emblem.style.filter = "drop-shadow(0 0 20px #e02424) hue-rotate(15deg)";
            mainTitle.style.textShadow = "3px 0 0 rgba(0,240,255,0.7), -3px 0 0 rgba(224,36,36,0.8)";
        };

        const stopGlitch = () => {
            emblem.style.filter = "";
            mainTitle.style.textShadow = "";
        };

        // 문양 마우스 오버
        emblem.addEventListener('mouseenter', startGlitch);
        emblem.addEventListener('mouseleave', stopGlitch);

        // 제목 마우스 오버
        mainTitle.addEventListener('mouseenter', startGlitch);
        mainTitle.addEventListener('mouseleave', stopGlitch);
    }
}

// 6. 전역 BGM 플레이어 초기화
function initBgmPlayer() {
    const player = document.querySelector('.gnb-player');
    const playBtn = document.getElementById('player-play-btn');
    const trackName = document.getElementById('player-track-name');
    const playlistDropdown = document.getElementById('player-playlist');

    if (!player || !playBtn || !trackName || !playlistDropdown) return;

    let currentTrackIndex = 0;
    const audio = new Audio();
    audio.loop = false; // 자동 다음 곡 전환을 위해 loop false

    // 플레이리스트 드롭다운 목록 동적 생성
    playlistDropdown.innerHTML = BGM_PLAYLIST.map((track, i) => `
        <li data-index="${i}" class="${i === 0 ? 'active' : ''}">${track.name}</li>
    `).join('');

    // 초기 트랙 로드
    function loadTrack(index) {
        currentTrackIndex = index;
        const track = BGM_PLAYLIST[index];
        audio.src = track.url;
        trackName.innerHTML = `<span class="track-name-inner">${track.name}</span>`;
        trackName.title = track.name; // 마우스 오버 툴팁

        // 렌더링 후 가로 길이를 비교하여 텍스트가 잘리는 경우에만 marquee 활성화 클래스 부여
        setTimeout(() => {
            const innerSpan = trackName.querySelector('.track-name-inner');
            if (innerSpan) {
                if (innerSpan.offsetWidth > trackName.clientWidth) {
                    trackName.classList.add('has-marquee');
                } else {
                    trackName.classList.remove('has-marquee');
                }
            }
        }, 50);
    }

    loadTrack(0);

    // [자동 재생 대응 로직]
    // 1. 즉각적인 자동 재생 시도
    attemptAutoplay();

    // 2. 브라우저 보안 정책에 의해 막힐 시를 대비해 화면 첫 클릭 시 강제 가동
    document.addEventListener('click', triggerPlayOnFirstClick, { once: true });

    function attemptAutoplay() {
        audio.play().then(() => {
            player.classList.add('playing');
            // 자동 재생 성공 시 대기용 클릭 이벤트 제거
            document.removeEventListener('click', triggerPlayOnFirstClick);
        }).catch(err => {
            console.log("▲ 브라우저 정책으로 자동 재생 대기: 사용자의 첫 화면 상호작용 후 활성화됩니다.");
        });
    }

    function triggerPlayOnFirstClick() {
        if (audio.paused) {
            attemptAutoplay();
        }
    }

    // 재생 토글 함수
    function togglePlay() {
        if (audio.paused) {
            audio.play().then(() => {
                player.classList.add('playing');
            }).catch(err => {
                console.error("오디오 재생 실패 (브라우저 정책):", err);
            });
        } else {
            audio.pause();
            player.classList.remove('playing');
        }
    }

    // 곡명 클릭 시 플레이리스트 토글
    trackName.addEventListener('click', (e) => {
        e.stopPropagation();
        playlistDropdown.classList.toggle('show');
    });

    // 플레이리스트 항목 선택 시 곡 전환
    playlistDropdown.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;

        const index = parseInt(li.dataset.index);

        // 드롭다운 내부 활성 클래스 업데이트
        playlistDropdown.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        li.classList.add('active');

        loadTrack(index);
        playlistDropdown.classList.remove('show');

        // 강제 재생 작동
        audio.play().then(() => {
            player.classList.add('playing');
        });
    });

    // 외부 영역 클릭 시 드롭다운 자동으로 닫기
    document.addEventListener('click', () => {
        playlistDropdown.classList.remove('show');
    });

    // 재생 버튼 바인딩
    playBtn.addEventListener('click', togglePlay);

    // 노래가 끝났을 때 자동 다음 트랙 재생
    audio.addEventListener('ended', () => {
        let nextIndex = currentTrackIndex + 1;
        if (nextIndex >= BGM_PLAYLIST.length) {
            nextIndex = 0;
        }

        // 플레이리스트 UI 활성 클래스 동기화
        playlistDropdown.querySelectorAll('li').forEach((item, idx) => {
            if (idx === nextIndex) item.classList.add('active');
            else item.classList.remove('active');
        });

        loadTrack(nextIndex);
        audio.play().then(() => {
            player.classList.add('playing');
        });
    });
}

// 7. 모바일 GNB 햄버거 토글 메뉴 바인딩
function initGnbToggle() {
    const toggleBtn = document.getElementById('gnb-toggle');
    const gnbLinks = document.getElementById('gnb-links');

    if (!toggleBtn || !gnbLinks) return;

    // 햄버거 버튼 클릭 시 메뉴 펼침/접힘 및 active 클래스 토글
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBtn.classList.toggle('active');
        gnbLinks.classList.toggle('active');
    });

    // 외부 영역 클릭 시 드롭다운 닫힘
    document.addEventListener('click', (e) => {
        if (!gnbLinks.contains(e.target) && !toggleBtn.contains(e.target)) {
            toggleBtn.classList.remove('active');
            gnbLinks.classList.remove('active');
        }
    });

    // 링크 선택 시 자동으로 드롭다운 메뉴 닫히게 바인딩 (이동성 최적화)
    gnbLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            toggleBtn.classList.remove('active');
            gnbLinks.classList.remove('active');
        });
    });
}
