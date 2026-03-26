// Open-Meteo API - 완전 무료, API 키 불필요 (https://open-meteo.com)

// WMO 날씨 코드 → 아이콘 + 설명 + 우산/장갑 필요 여부
function getWeatherInfo(code) {
    if (code === 0)                         return { emoji: '☀️',  desc: '맑음',         rain: false, snow: false };
    if (code === 1)                         return { emoji: '🌤️', desc: '대체로 맑음',   rain: false, snow: false };
    if (code === 2)                         return { emoji: '⛅',  desc: '구름 조금',    rain: false, snow: false };
    if (code === 3)                         return { emoji: '☁️',  desc: '흐림',         rain: false, snow: false };
    if ([45, 48].includes(code))            return { emoji: '🌫️', desc: '안개',         rain: false, snow: false };
    if ([51, 53, 55].includes(code))        return { emoji: '🌦️', desc: '이슬비',       rain: true,  snow: false };
    if ([56, 57].includes(code))            return { emoji: '🌨️', desc: '어는 이슬비',  rain: true,  snow: true  };
    if ([61, 63, 65].includes(code))        return { emoji: '🌧️', desc: '비',           rain: true,  snow: false };
    if ([66, 67].includes(code))            return { emoji: '🌨️', desc: '어는 비',      rain: true,  snow: true  };
    if ([71, 73, 75, 77].includes(code))    return { emoji: '❄️',  desc: '눈',           rain: false, snow: true  };
    if ([80, 81, 82].includes(code))        return { emoji: '🌧️', desc: '소나기',       rain: true,  snow: false };
    if ([85, 86].includes(code))            return { emoji: '🌨️', desc: '눈 소나기',    rain: false, snow: true  };
    if ([95, 96, 99].includes(code))        return { emoji: '⛈️',  desc: '뇌우',         rain: true,  snow: false };
    return { emoji: '🌡️', desc: '날씨 정보', rain: false, snow: false };
}

class WeatherCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .card {
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
                    gap: 16px;
                    margin: 10px 0;
                }
                .weather-emoji { font-size: 4em; line-height: 1; }
                .temperature { font-size: 4em; font-weight: bold; color: #333; }
                .desc { font-size: 1.2em; color: #555; margin: 8px 0 14px; }
                .detail {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    font-size: 0.95em;
                    color: #888;
                    margin-bottom: 24px;
                }
                h2 { font-size: 1.4em; color: #333; margin: 0 0 12px; }
                .tags {
                    list-style: none;
                    padding: 0; margin: 0;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 8px;
                }
                .tags li {
                    background: #ffecd2;
                    border-radius: 20px;
                    padding: 6px 14px;
                    font-size: 1em;
                    color: #555;
                }
                .status {
                    font-size: 1.1em;
                    color: #888;
                    padding: 20px 0;
                }
                .credit {
                    font-size: 0.72em;
                    color: #ccc;
                    margin-top: 16px;
                }
            </style>
            <div class="card">
                <h1>오늘 뭐 입지?</h1>
                <div id="content"><p class="status">📍 위치 확인 중...</p></div>
            </div>
        `;
    }

    connectedCallback() {
        if (!navigator.geolocation) {
            this.show('<p class="status">⚠️ 이 브라우저는 위치 정보를 지원하지 않습니다.</p>');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => this.fetchWeather(pos.coords.latitude, pos.coords.longitude),
            () => this.show('<p class="status">⚠️ 위치 권한을 허용해주세요.</p>')
        );
    }

    async fetchWeather(lat, lon) {
        this.show('<p class="status">🌤️ 날씨 불러오는 중...</p>');
        const url = `https://api.open-meteo.com/v1/forecast`
            + `?latitude=${lat}&longitude=${lon}`
            + `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`
            + `&wind_speed_unit=ms&timezone=auto`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const c = data.current;
            this.render({
                temp: c.temperature_2m,
                humidity: c.relative_humidity_2m,
                wind: c.wind_speed_10m,
                code: c.weather_code
            });
        } catch (e) {
            this.show(`<p class="status">⚠️ 날씨 데이터를 가져오지 못했습니다.<br>${e.message}</p>`);
        }
    }

    render({ temp, humidity, wind, code }) {
        const { emoji, desc, rain, snow } = getWeatherInfo(code);
        const clothes = this.getClothes(temp, rain, snow);
        this.show(`
            <div class="weather-info">
                <span class="weather-emoji">${emoji}</span>
                <span class="temperature">${Math.round(temp)}°</span>
            </div>
            <p class="desc">${desc}</p>
            <div class="detail">
                <span>💧 습도 ${humidity}%</span>
                <span>💨 바람 ${wind}m/s</span>
            </div>
            <div>
                <h2>오늘의 추천 옷차림</h2>
                <ul class="tags">
                    ${clothes.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
            <p class="credit">Open-Meteo 날씨 데이터</p>
        `);
    }

    getClothes(temp, rain, snow) {
        let list;
        if      (temp >= 28) list = ['민소매', '반팔', '반바지', '원피스'];
        else if (temp >= 23) list = ['반팔', '얇은 셔츠', '반바지', '면바지'];
        else if (temp >= 20) list = ['얇은 가디건', '긴팔티', '면바지', '청바지'];
        else if (temp >= 17) list = ['얇은 니트', '맨투맨', '가디건', '청바지'];
        else if (temp >= 12) list = ['자켓', '가디건', '야상', '스타킹', '청바지'];
        else if (temp >= 9)  list = ['자켓', '트렌치코트', '니트', '청바지', '기모바지'];
        else if (temp >= 5)  list = ['코트', '가죽자켓', '히트텍', '니트', '레깅스'];
        else                 list = ['패딩', '두꺼운 코트', '목도리', '기모 제품'];
        if (rain) list = [...list, '☂️ 우산'];
        if (snow) list = [...list, '🧤 장갑'];
        return list;
    }

    show(html) {
        this.shadowRoot.querySelector('#content').innerHTML = html;
    }
}

customElements.define('weather-card', WeatherCard);
