// 기상청 Open API 서비스키 (https://www.data.go.kr 에서 발급)
// "기상청_단기예보 조회서비스" 또는 "기상청_초단기실황조회" 신청 후 사용
const KMA_SERVICE_KEY = 'YOUR_KMA_SERVICE_KEY';

// 위경도 → 기상청 격자(nx, ny) 변환 함수 (기상청 공식 알고리즘)
function latLonToGrid(lat, lon) {
    const RE = 6371.00877, GRID = 5.0;
    const SLAT1 = 30.0, SLAT2 = 60.0;
    const OLON = 126.0, OLAT = 38.0;
    const XO = 43, YO = 136;
    const DEGRAD = Math.PI / 180.0;
    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD, olat = OLAT * DEGRAD;

    let sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) /
             Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5));
    let sf = Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) * Math.cos(slat1) / sn;
    let ro = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);

    const ra = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5), sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    return {
        nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
        ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
    };
}

// 기상청 API 호출 기준 시각 계산 (초단기실황: 매시 정각 발표, 40분 이후 조회 가능)
function getBaseDateTime() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    let hour = now.getHours();
    if (now.getMinutes() < 40) hour -= 1;
    if (hour < 0) hour = 23;
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    return { base_date: `${y}${m}${d}`, base_time: `${pad(hour)}00` };
}

// 강수형태 코드 → 아이콘/설명
function getPtyInfo(pty) {
    const map = {
        0: { emoji: '☀️', desc: '맑음' },
        1: { emoji: '🌧️', desc: '비' },
        2: { emoji: '🌨️', desc: '비/눈' },
        3: { emoji: '❄️', desc: '눈' },
        5: { emoji: '🌦️', desc: '빗방울' },
        6: { emoji: '🌨️', desc: '빗방울/눈날림' },
        7: { emoji: '🌨️', desc: '눈날림' }
    };
    return map[pty] ?? { emoji: '🌤️', desc: '정보 없음' };
}

class WeatherCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .weather-card-container {
                    padding: 30px;
                    text-align: center;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                h1 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2.5em;
                    margin: 0 0 20px;
                    color: #333;
                }
                .weather-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 10px 0;
                    gap: 16px;
                }
                .weather-emoji { font-size: 4em; line-height: 1; }
                .temperature {
                    font-size: 4em;
                    font-weight: bold;
                    color: #333;
                }
                .weather-description {
                    font-size: 1.2em;
                    color: #555;
                    margin: 8px 0 16px;
                }
                .weather-detail {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    font-size: 0.95em;
                    color: #888;
                    margin-bottom: 24px;
                }
                .recommendation h2 {
                    font-size: 1.4em;
                    color: #333;
                    margin-bottom: 12px;
                }
                .recommendation-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 8px;
                }
                .recommendation-list li {
                    background: #ffecd2;
                    border-radius: 20px;
                    padding: 6px 14px;
                    font-size: 1em;
                    color: #555;
                }
                .loading, .error {
                    font-size: 1.1em;
                    color: #888;
                    padding: 20px 0;
                }
                .api-notice {
                    font-size: 0.8em;
                    color: #aaa;
                    margin-top: 20px;
                    line-height: 1.5;
                }
            </style>
            <div class="weather-card-container">
                <h1>오늘 뭐 입지?</h1>
                <div id="weather-content">
                    <p class="loading">📍 위치 확인 중...</p>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.getLocation();
    }

    getLocation() {
        if (!navigator.geolocation) {
            this.showError('이 브라우저는 위치 정보를 지원하지 않습니다.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => this.fetchWeather(pos),
            () => this.showError('위치 정보를 가져올 수 없습니다. 브라우저 위치 권한을 허용해주세요.')
        );
    }

    async fetchWeather(position) {
        const { latitude, longitude } = position.coords;
        const { nx, ny } = latLonToGrid(latitude, longitude);
        const { base_date, base_time } = getBaseDateTime();

        const content = this.shadowRoot.querySelector('#weather-content');
        content.innerHTML = `<p class="loading">🌤️ 기상청 날씨 불러오는 중...</p>`;

        const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`
            + `?serviceKey=${KMA_SERVICE_KEY}`
            + `&numOfRows=10&pageNo=1&dataType=JSON`
            + `&base_date=${base_date}&base_time=${base_time}`
            + `&nx=${nx}&ny=${ny}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            const resultCode = json.response?.header?.resultCode;
            if (resultCode !== '00') {
                const msg = json.response?.header?.resultMsg || '알 수 없는 오류';
                if (resultCode === '03' || KMA_SERVICE_KEY === 'YOUR_KMA_SERVICE_KEY') {
                    this.showApiKeyNotice();
                } else {
                    throw new Error(`기상청 API 오류: ${msg}`);
                }
                return;
            }

            const items = json.response.body.items.item;
            const get = cat => parseFloat(items.find(i => i.category === cat)?.obsrValue ?? 'NaN');

            const temp = get('T1H');
            const pty  = parseInt(items.find(i => i.category === 'PTY')?.obsrValue ?? '0');
            const reh  = get('REH');
            const wsd  = get('WSD');

            this.renderWeather({ temp, pty, reh, wsd, nx, ny });
        } catch (err) {
            if (KMA_SERVICE_KEY === 'YOUR_KMA_SERVICE_KEY') {
                this.showApiKeyNotice();
            } else {
                this.showError(`날씨 데이터를 가져오지 못했습니다. (${err.message})`);
            }
        }
    }

    renderWeather({ temp, pty, reh, wsd }) {
        const content = this.shadowRoot.querySelector('#weather-content');
        const { emoji, desc } = getPtyInfo(pty);
        const recommendation = this.getRecommendation(temp, pty);

        content.innerHTML = `
            <div class="weather-info">
                <span class="weather-emoji">${emoji}</span>
                <span class="temperature">${isNaN(temp) ? '--' : Math.round(temp)}°</span>
            </div>
            <p class="weather-description">${desc}</p>
            <div class="weather-detail">
                <span>💧 습도 ${isNaN(reh) ? '--' : reh}%</span>
                <span>💨 바람 ${isNaN(wsd) ? '--' : wsd}m/s</span>
            </div>
            <div class="recommendation">
                <h2>오늘의 추천 옷차림</h2>
                <ul class="recommendation-list">
                    ${recommendation.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            <p style="font-size:0.75em;color:#bbb;margin-top:16px;">기상청 초단기실황 데이터</p>
        `;
    }

    getRecommendation(temp, pty) {
        let clothes = [];
        if (temp >= 28)      clothes = ['민소매', '반팔', '반바지', '원피스'];
        else if (temp >= 23) clothes = ['반팔', '얇은 셔츠', '반바지', '면바지'];
        else if (temp >= 20) clothes = ['얇은 가디건', '긴팔티', '면바지', '청바지'];
        else if (temp >= 17) clothes = ['얇은 니트', '맨투맨', '가디건', '청바지'];
        else if (temp >= 12) clothes = ['자켓', '가디건', '야상', '스타킹', '청바지'];
        else if (temp >= 9)  clothes = ['자켓', '트렌치코트', '니트', '청바지', '기모바지'];
        else if (temp >= 5)  clothes = ['코트', '가죽자켓', '히트텍', '니트', '레깅스'];
        else                 clothes = ['패딩', '두꺼운 코트', '목도리', '기모 제품'];

        // 비/눈 올 때 우산 추가
        if ([1, 2, 5, 6].includes(pty)) clothes = [...clothes, '☂️ 우산'];
        if ([2, 3, 7].includes(pty))    clothes = [...clothes, '🧤 장갑'];
        return clothes;
    }

    showApiKeyNotice() {
        const content = this.shadowRoot.querySelector('#weather-content');
        content.innerHTML = `
            <p class="weather-emoji" style="font-size:3em">🔑</p>
            <p class="error">기상청 API 키가 필요합니다</p>
            <div class="api-notice">
                1. <a href="https://www.data.go.kr" target="_blank">data.go.kr</a> 회원가입<br>
                2. <strong>기상청_단기예보 조회서비스</strong> 검색 후 활용신청<br>
                3. 발급받은 서비스키를 main.js의<br>
                <code>KMA_SERVICE_KEY</code>에 입력
            </div>
        `;
    }

    showError(msg) {
        const content = this.shadowRoot.querySelector('#weather-content');
        content.innerHTML = `<p class="error">⚠️ ${msg}</p>`;
    }
}

customElements.define('weather-card', WeatherCard);
