const API_KEY = 'YOUR_API_KEY'; // OpenWeatherMap API 키를 여기에 입력하세요.

class WeatherCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
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
                    margin: 0;
                    color: #333;
                }
                .weather-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 20px 0;
                }
                .weather-icon {
                    width: 80px;
                    height: 80px;
                }
                .temperature {
                    font-size: 4em;
                    font-weight: bold;
                    margin-left: 20px;
                    color: #333;
                }
                .weather-description {
                    font-size: 1.2em;
                    color: #555;
                    text-transform: capitalize;
                    margin-bottom: 30px;
                }
                .recommendation h2 {
                    font-size: 1.5em;
                    color: #333;
                    margin-bottom: 15px;
                }
                .recommendation-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    font-size: 1.1em;
                    color: #777;
                }
                .recommendation-list li {
                    margin-bottom: 8px;
                }
                 .loading, .error {
                    font-size: 1.2em;
                    color: #555;
                }
            </style>
            <div class="weather-card-container">
                <h1>오늘 뭐 입지?</h1>
                <div id="weather-content">
                     <p class="loading">날씨 정보를 불러오는 중...</p>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.getLocation();
    }

    getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this.fetchWeather.bind(this), this.showError.bind(this));
        } else {
            this.showError({ message: "Geolocation is not supported by this browser." });
        }
    }

    async fetchWeather(position) {
        const { latitude, longitude } = position.coords;
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Weather data not available');
            }
            const data = await response.json();
            this.renderWeather(data);
        } catch (error) {
            this.showError(error);
        }
    }

    renderWeather(data) {
        const weatherContent = this.shadowRoot.querySelector('#weather-content');
        const recommendation = this.getRecommendation(data.main.temp, data.weather[0].main);

        weatherContent.innerHTML = `
            <div class="weather-info">
                <img src="http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="Weather Icon" class="weather-icon">
                <div class="temperature">${Math.round(data.main.temp)}°</div>
            </div>
            <p class="weather-description">${data.weather[0].description}</p>
            <div class="recommendation">
                <h2>오늘의 추천 옷차림</h2>
                <ul class="recommendation-list">
                    ${recommendation.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    getRecommendation(temp, weather) {
        if (temp >= 28) return ['민소매', '반팔', '반바지', '원피스'];
        if (temp >= 23) return ['반팔', '얇은 셔츠', '반바지', '면바지'];
        if (temp >= 20) return ['얇은 가디건', '긴팔티', '면바지', '청바지'];
        if (temp >= 17) return ['얇은 니트', '맨투맨', '가디건', '청바지'];
        if (temp >= 12) return ['자켓', '가디건', '야상', '스타킹', '청바지'];
        if (temp >= 9) return ['자켓', '트렌치코트', '니트', '청바지', '기모바지'];
        if (temp >= 5) return ['코트', '가죽자켓', '히트텍', '니트', '레깅스'];
        return ['패딩', '두꺼운 코트', '목도리', '기모 제품'];
    }

    showError(error) {
        const weatherContent = this.shadowRoot.querySelector('#weather-content');
        weatherContent.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

customElements.define('weather-card', WeatherCard);
