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
        initGalleryModal();

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

// 3. 개체 아카이브(Specimen) 동적 렌더링 및 탭 전환 바인딩
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
                            <h4>개체 상세 내용</h4>
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
            
            // 갤러리 업데이트
            updateGallery(tabId);
        });
    });

    // 초기 첫 번째 개체의 갤러리 로드
    if (specimens.length > 0) {
        updateGallery(specimens[0].id);
    }
}

// 3.5. 개체 시각 기록 갤러리 업데이트 및 모달 연동
function updateGallery(specimenId) {
    const galleryWrapper = document.getElementById('gallery-wrapper');
    if (!galleryWrapper) return;

    // specimensData에서 해당 개체 검색
    const specimen = specimensData.find(s => s.id === String(specimenId));
    if (!specimen) return;

    galleryWrapper.innerHTML = "";

    // 갤러리 이미지가 존재하는 경우
    if (specimen.gallery && specimen.gallery.length > 0) {
        let carouselHTML = `
            <div class="gallery-carousel-container">
                <button class="gallery-nav-btn prev-btn" id="gallery-prev" aria-label="이전 이미지">
                    <svg viewBox="0 0 24 24" width="24" height="24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg>
                </button>
                <div class="gallery-carousel-viewport">
                    <div class="gallery-carousel-track" id="gallery-track">
        `;
        
        specimen.gallery.forEach((imgRelPath, index) => {
            const imgUrl = getAssetUrl(imgRelPath);
            const numStr = String(index + 1).padStart(2, '0');
            const baseName = imgRelPath.substring(imgRelPath.lastIndexOf('/') + 1);
            const filename = baseName.substring(0, baseName.lastIndexOf('.')).toUpperCase();
            
            carouselHTML += `
                <div class="gallery-item" data-img-url="${imgUrl}" data-img-name="${filename}" data-img-desc="SCAN_LOG_${numStr} // CAPTURED BY: CAMERA_${specimen.code}_${numStr}">
                    <div class="gallery-item-corner tl"></div>
                    <div class="gallery-item-corner tr"></div>
                    <div class="gallery-item-corner bl"></div>
                    <div class="gallery-item-corner br"></div>
                    <div class="gallery-scan-line"></div>
                    <div class="gallery-img-container">
                        <img src="${imgUrl}" class="gallery-img" alt="${specimen.name} Scan ${numStr}">
                    </div>
                    <div class="gallery-meta">
                        <span class="gallery-meta-tag">// PHOTO_SCAN_${numStr}</span>
                        <h4 class="gallery-meta-title">${filename}</h4>
                    </div>
                </div>
            `;
        });
        
        carouselHTML += `
                    </div>
                </div>
                <button class="gallery-nav-btn next-btn" id="gallery-next" aria-label="다음 이미지">
                    <svg viewBox="0 0 24 24" width="24" height="24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>
                </button>
            </div>
        `;
        galleryWrapper.innerHTML = carouselHTML;
        
        // 캐러셀 로직 가동
        initCarouselLogic();
    } else {
        // 갤러리 이미지가 없는 경우 (디스토피아 터미널 경고창 노출)
        galleryWrapper.innerHTML = `
            <div class="no-gallery-msg">
                <span class="warning-icon">▲</span>
                <p><strong>[ ACCESS RESTRICTED // DECRYPTION FAILED ]</strong></p>
                <p>대상 개체와 관련된 유효한 시각 보존 기록(MEDIA ARCHIVE)을 찾을 수 없습니다.</p>
                <div class="sub-text">ERROR CODE: SEC_DATA_NULL_0x00A3 - SCAN FILES UNRECOVERABLE</div>
            </div>
        `;
    }
}

// 캐러셀 슬라이드 동작 및 예외 처리 로직
function initCarouselLogic() {
    const track = document.getElementById('gallery-track');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');
    
    if (!track || !prevBtn || !nextBtn) return;
    
    const items = track.querySelectorAll('.gallery-item');
    const totalItems = items.length;
    if (totalItems === 0) return;
    
    let currentIndex = 0;
    
    function getItemsPerPage() {
        if (window.innerWidth > 1024) return 3;
        if (window.innerWidth > 768) return 2;
        return 1;
    }
    
    let resizeTimer;
    
    function updateCarousel() {
        const itemsPerPage = getItemsPerPage();
        const maxIndex = Math.max(0, totalItems - itemsPerPage);
        
        // 현재 인덱스가 최대값보다 크면 재조정
        if (currentIndex > maxIndex) {
            currentIndex = maxIndex;
        }
        
        // 첫 번째 이미지 너비 및 gap 값 추출
        const itemWidth = items[0].getBoundingClientRect().width;
        const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
        
        const shiftX = currentIndex * (itemWidth + gap);
        track.style.transform = `translateX(-${shiftX}px)`;
        
        // 이전/다음 버튼 비활성화 클래스 토글
        if (currentIndex === 0) {
            prevBtn.classList.add('disabled');
        } else {
            prevBtn.classList.remove('disabled');
        }
        
        if (currentIndex >= maxIndex) {
            nextBtn.classList.add('disabled');
        } else {
            nextBtn.classList.remove('disabled');
        }
        
        // 전체 아이템 개수가 한 화면 노출 개수보다 적으면 네비게이션 버튼 자체를 보이지 않음
        if (totalItems <= itemsPerPage) {
            prevBtn.style.opacity = '0';
            prevBtn.style.pointerEvents = 'none';
            nextBtn.style.opacity = '0';
            nextBtn.style.pointerEvents = 'none';
        } else {
            prevBtn.style.opacity = '';
            prevBtn.style.pointerEvents = '';
            nextBtn.style.opacity = '';
            nextBtn.style.pointerEvents = '';
        }
    }
    
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const itemsPerPage = getItemsPerPage();
        const maxIndex = Math.max(0, totalItems - itemsPerPage);
        if (currentIndex < maxIndex) {
            currentIndex++;
            updateCarousel();
        }
    });
    
    // 윈도우 크기 변환 시 위치 자동 조정 (디바운싱 적용으로 성능 최적화)
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateCarousel, 100);
    });
    
    // 초기 정렬 적용
    updateCarousel();
    
    // 이미지 클릭 시 모달 연동 바인딩
    bindGalleryItems();
}

// 갤러리 아이템 클릭 시 라이트박스 띄우기
function bindGalleryItems() {
    const modal = document.getElementById('gallery-modal');
    const modalImg = document.getElementById('gallery-modal-img');
    const modalTitle = document.getElementById('gallery-modal-title');
    const modalDesc = document.getElementById('gallery-modal-desc');
    
    if (!modal || !modalImg || !modalTitle || !modalDesc) return;

    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const url = item.getAttribute('data-img-url');
            const name = item.getAttribute('data-img-name');
            const desc = item.getAttribute('data-img-desc');
            
            modalImg.src = url;
            modalTitle.textContent = name;
            modalDesc.textContent = desc;
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });
}

// 갤러리 라이트박스 모달 닫기 이벤트 초기화
function initGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    const closeBtn = document.getElementById('gallery-modal-close');
    
    if (!modal || !closeBtn) return;

    function closeGalleryModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeGalleryModal);
    modal.querySelector('.modal-overlay').addEventListener('click', closeGalleryModal);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeGalleryModal();
        }
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

    // 모달 관련 요소 취득
    const playerIcon = document.getElementById('player-icon');
    const musicModal = document.getElementById('music-modal');
    const musicModalClose = document.getElementById('music-modal-close');
    const modalContent = musicModal ? musicModal.querySelector('.music-modal-content') : null;
    const modalTrackTitle = document.getElementById('modal-track-title');
    const modalTrackStatus = document.getElementById('modal-track-status');
    const modalPlayBtn = document.getElementById('modal-play-btn');
    const modalPrevBtn = document.getElementById('modal-prev-btn');
    const modalNextBtn = document.getElementById('modal-next-btn');
    const modalPlaylist = document.getElementById('modal-playlist');

    if (!player || !playBtn || !trackName || !playlistDropdown) return;

    let currentTrackIndex = 0;
    const audio = new Audio();
    audio.loop = false; // 자동 다음 곡 전환을 위해 loop false

    // 플레이리스트 드롭다운 목록 동적 생성
    const dropdownHtml = BGM_PLAYLIST.map((track, i) => `
        <li data-index="${i}" class="${i === 0 ? 'active' : ''}">${track.name}</li>
    `).join('');
    playlistDropdown.innerHTML = dropdownHtml;

    // 모달 내부 플레이리스트 목록 동적 생성
    if (modalPlaylist) {
        modalPlaylist.innerHTML = dropdownHtml;
    }

    // 재생 상태 및 UI 통합 관리 함수
    function setPlayState(isPlaying) {
        if (isPlaying) {
            player.classList.add('playing');
            if (modalContent) modalContent.classList.add('playing');
            if (modalTrackStatus) modalTrackStatus.textContent = 'PLAYING';
        } else {
            player.classList.remove('playing');
            if (modalContent) modalContent.classList.remove('playing');
            if (modalTrackStatus) modalTrackStatus.textContent = 'PAUSED';
        }
    }

    // 초기 트랙 로드
    function loadTrack(index) {
        currentTrackIndex = index;
        const track = BGM_PLAYLIST[index];
        audio.src = track.url;
        trackName.innerHTML = `<span class="track-name-inner">${track.name}</span>`;
        trackName.title = track.name; // 마우스 오버 툴팁

        if (modalTrackTitle) {
            modalTrackTitle.textContent = track.name;
        }

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

        // 플레이리스트 UI 활성 클래스 동기화 (GNB 드롭다운 & 모달 리스트)
        [playlistDropdown, modalPlaylist].forEach(list => {
            if (list) {
                list.querySelectorAll('li').forEach((item, idx) => {
                    if (idx === index) item.classList.add('active');
                    else item.classList.remove('active');
                });
            }
        });
    }

    loadTrack(0);

    // [자동 재생 대응 로직]
    // 1. 즉각적인 자동 재생 시도
    attemptAutoplay();

    // 2. 브라우저 보안 정책에 의해 막힐 시를 대비해 화면 첫 클릭 시 강제 가동
    document.addEventListener('click', triggerPlayOnFirstClick, { once: true });

    function attemptAutoplay() {
        audio.play().then(() => {
            setPlayState(true);
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
                setPlayState(true);
            }).catch(err => {
                console.error("오디오 재생 실패 (브라우저 정책):", err);
            });
        } else {
            audio.pause();
            setPlayState(false);
        }
    }

    // 곡명 클릭 시 플레이리스트 토글
    trackName.addEventListener('click', (e) => {
        e.stopPropagation();
        playlistDropdown.classList.toggle('show');
    });

    // 트랙 전환 공통 함수 (전환 후 자동 재생)
    function changeTrack(index) {
        loadTrack(index);
        audio.play().then(() => {
            setPlayState(true);
        }).catch(err => {
            console.error("트랙 재생 전환 실패:", err);
        });
    }

    // GNB 플레이리스트 항목 선택 시 곡 전환
    playlistDropdown.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const index = parseInt(li.dataset.index);
        playlistDropdown.classList.remove('show');
        changeTrack(index);
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
        changeTrack(nextIndex);
    });

    // === [추가] 모달 제어 이벤트 바인딩 ===
    
    // 음표 아이콘 클릭 시 모달 열기
    if (playerIcon && musicModal) {
        playerIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            musicModal.classList.add('active');
        });
    }

    // 모달 닫기
    if (musicModalClose && musicModal) {
        musicModalClose.addEventListener('click', () => {
            musicModal.classList.remove('active');
        });
    }

    // 모달 배경 클릭 시 닫기
    const modalOverlay = musicModal ? musicModal.querySelector('.modal-overlay') : null;
    if (modalOverlay && musicModal) {
        modalOverlay.addEventListener('click', () => {
            musicModal.classList.remove('active');
        });
    }

    // 모달 내부 재생/일시정지
    if (modalPlayBtn) {
        modalPlayBtn.addEventListener('click', togglePlay);
    }

    // 모달 내부 이전 곡 버튼
    if (modalPrevBtn) {
        modalPrevBtn.addEventListener('click', () => {
            let prevIndex = currentTrackIndex - 1;
            if (prevIndex < 0) {
                prevIndex = BGM_PLAYLIST.length - 1;
            }
            changeTrack(prevIndex);
        });
    }

    // 모달 내부 다음 곡 버튼
    if (modalNextBtn) {
        modalNextBtn.addEventListener('click', () => {
            let nextIndex = currentTrackIndex + 1;
            if (nextIndex >= BGM_PLAYLIST.length) {
                nextIndex = 0;
            }
            changeTrack(nextIndex);
        });
    }

    // 모달 내부 플레이리스트 곡 선택
    if (modalPlaylist) {
        modalPlaylist.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const index = parseInt(li.dataset.index);
            changeTrack(index);
        });
    }
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
