// Open-Meteo - 무료, API 키 불필요
const SEOUL = { lat: 37.5665, lon: 126.9780 };

// 옷차림 → Unsplash 검색어 매핑
const CLOTHES = {
    '민소매':       'womens+tank+top+fashion',
    '반팔':         'white+tshirt+casual+fashion',
    '반바지':       'casual+shorts+summer+fashion',
    '원피스':       'summer+dress+fashion+woman',
    '얇은 셔츠':    'light+linen+shirt+fashion',
    '면바지':       'cotton+trousers+casual+fashion',
    '얇은 가디건':  'light+cardigan+fashion+woman',
    '긴팔티':       'long+sleeve+tshirt+casual',
    '청바지':       'denim+jeans+fashion+street',
    '얇은 니트':    'light+knit+sweater+fashion',
    '맨투맨':       'sweatshirt+streetwear+casual',
    '가디건':       'cardigan+autumn+fashion',
    '스타킹':       'tights+fashion+woman',
    '야상':         'field+jacket+military+fashion',
    '자켓':         'casual+jacket+autumn+fashion',
    '트렌치코트':   'trench+coat+fashion+woman',
    '니트':         'knit+sweater+autumn+fashion',
    '기모바지':     'warm+fleece+pants+winter',
    '코트':         'winter+coat+fashion+woman',
    '가죽자켓':     'leather+jacket+fashion+street',
    '히트텍':       'thermal+underwear+winter',
    '레깅스':       'leggings+winter+fashion+woman',
    '패딩':         'puffer+jacket+down+winter',
    '두꺼운 코트':  'heavy+wool+coat+winter+fashion',
    '목도리':       'scarf+winter+fashion',
    '기모 제품':    'fleece+hoodie+winter+cozy',
    '우산':         'umbrella+rain+fashion',
    '장갑':         'winter+gloves+fashion',
};

function getWeatherInfo(code) {
    if (code === 0)                      return { emoji: '☀️',  desc: '맑음' };
    if (code === 1)                      return { emoji: '🌤️', desc: '대체로 맑음' };
    if (code === 2)                      return { emoji: '⛅',  desc: '구름 조금' };
    if (code === 3)                      return { emoji: '☁️',  desc: '흐림' };
    if ([45,48].includes(code))          return { emoji: '🌫️', desc: '안개' };
    if ([51,53,55].includes(code))       return { emoji: '🌦️', desc: '이슬비' };
    if ([61,63,65].includes(code))       return { emoji: '🌧️', desc: '비' };
    if ([71,73,75,77].includes(code))    return { emoji: '❄️',  desc: '눈' };
    if ([80,81,82].includes(code))       return { emoji: '🌧️', desc: '소나기' };
    if ([85,86].includes(code))          return { emoji: '🌨️', desc: '눈 소나기' };
    if ([95,96,99].includes(code))       return { emoji: '⛈️',  desc: '뇌우' };
    return { emoji: '🌡️', desc: '날씨 정보' };
}

function getClothes(temp, code) {
    let list;
    if      (temp >= 28) list = ['민소매', '반팔', '반바지', '원피스'];
    else if (temp >= 23) list = ['반팔', '얇은 셔츠', '반바지', '면바지'];
    else if (temp >= 20) list = ['얇은 가디건', '긴팔티', '면바지', '청바지'];
    else if (temp >= 17) list = ['얇은 니트', '맨투맨', '가디건', '청바지'];
    else if (temp >= 12) list = ['자켓', '야상', '가디건', '스타킹', '청바지'];
    else if (temp >= 9)  list = ['자켓', '트렌치코트', '니트', '청바지', '기모바지'];
    else if (temp >= 5)  list = ['코트', '가죽자켓', '히트텍', '니트', '레깅스'];
    else                 list = ['패딩', '두꺼운 코트', '목도리', '기모 제품'];

    const rain = [51,53,55,61,63,65,80,81,82,56,57,66,67,95,96,99].includes(code);
    const snow = [71,73,75,77,85,86,56,57,66,67].includes(code);
    if (rain) list = [...list, '우산'];
    if (snow) list = [...list, '장갑'];
    return list;
}

function imgUrl(item) {
    const q = CLOTHES[item] ?? 'fashion+clothing';
    return `https://source.unsplash.com/240x300/?${q}`;
}

class WeatherCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                * { box-sizing: border-box; }
                .card {
                    padding: 28px 24px 32px;
                    text-align: center;
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                h1 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2.2em;
                    margin: 0 0 4px;
                    color: #333;
                }
                .location {
                    font-size: 0.95em;
                    color: #aaa;
                    margin-bottom: 18px;
                }
                .weather-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                    margin-bottom: 6px;
                }
                .emoji { font-size: 3.5em; line-height: 1; }
                .temp  { font-size: 3.8em; font-weight: 700; color: #333; }
                .desc  { font-size: 1.1em; color: #666; margin: 4px 0 12px; }
                .detail {
                    display: flex;
                    justify-content: center;
                    gap: 18px;
                    font-size: 0.9em;
                    color: #999;
                    margin-bottom: 28px;
                }
                h2 {
                    font-size: 1.25em;
                    color: #333;
                    margin: 0 0 16px;
                    font-weight: 700;
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                    gap: 14px;
                }
                .item {
                    border-radius: 14px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    background: #f9f9f9;
                    transition: transform 0.2s;
                }
                .item:hover { transform: translateY(-4px); }
                .item img {
                    width: 100%;
                    aspect-ratio: 4/5;
                    object-fit: cover;
                    display: block;
                }
                .item-label {
                    padding: 8px 6px;
                    font-size: 0.85em;
                    color: #555;
                    font-weight: 600;
                    background: white;
                }
                .status {
                    font-size: 1.05em;
                    color: #aaa;
                    padding: 30px 0;
                }
                .credit {
                    font-size: 0.7em;
                    color: #ddd;
                    margin-top: 20px;
                }
            </style>
            <div class="card">
                <h1>오늘 뭐 입지?</h1>
                <p class="location">📍 서울특별시</p>
                <div id="content"><p class="status">🌤️ 날씨 불러오는 중...</p></div>
            </div>
        `;
    }

    async connectedCallback() {
        await this.fetchWeather();
    }

    async fetchWeather() {
        const { lat, lon } = SEOUL;
        const url = `https://api.open-meteo.com/v1/forecast`
            + `?latitude=${lat}&longitude=${lon}`
            + `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
            + `&wind_speed_unit=ms&timezone=Asia/Seoul`;
        try {
            const res  = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const c    = data.current;
            this.render({
                temp:     c.temperature_2m,
                humidity: c.relative_humidity_2m,
                wind:     c.wind_speed_10m,
                code:     c.weather_code,
            });
        } catch (e) {
            this.show(`<p class="status">⚠️ 날씨를 불러오지 못했습니다.<br><small>${e.message}</small></p>`);
        }
    }

    render({ temp, humidity, wind, code }) {
        const { emoji, desc } = getWeatherInfo(code);
        const clothes = getClothes(temp, code);

        const gridHTML = clothes.map(item => `
            <div class="item">
                <img src="${imgUrl(item)}" alt="${item}" loading="lazy">
                <div class="item-label">${item.replace('우산', '☂️ 우산').replace('장갑', '🧤 장갑')}</div>
            </div>
        `).join('');

        this.show(`
            <div class="weather-row">
                <span class="emoji">${emoji}</span>
                <span class="temp">${Math.round(temp)}°</span>
            </div>
            <p class="desc">${desc}</p>
            <div class="detail">
                <span>💧 습도 ${humidity}%</span>
                <span>💨 바람 ${wind}m/s</span>
            </div>
            <h2>오늘의 추천 옷차림</h2>
            <div class="grid">${gridHTML}</div>
            <p class="credit">Open-Meteo 날씨 · Unsplash 이미지</p>
        `);
    }

    show(html) {
        this.shadowRoot.querySelector('#content').innerHTML = html;
    }
}

customElements.define('weather-card', WeatherCard);
