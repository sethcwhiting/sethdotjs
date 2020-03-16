import React, { useEffect, useState } from "react";
import { Link } from "gatsby";
import parse from "csv-parse";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

import Layout from "../components/layout"
import SEO from "../components/seo"

function convertToArrayOfObjects(data) {
    var keys = data.shift(),
        i = 0, k = 0,
        obj = null,
        output = [];
    for (i = 0; i < data.length; i++) {
        obj = {};
        for (k = 0; k < keys.length; k++) obj[keys[k]] = data[i][k];
        output.push(obj);
    }
    return output;
}

const msInDay = 1000 * 60 * 60 * 24;
const startTime = new Date('2020-01-22').getTime();
const now = new Date();
const todayTime = new Date(`${now.getFullYear()}-${now.getMonth() < 9 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1}-${now.getDate() < 10 ? '0' + now.getDate() : now.getDate()}`).getTime();
const diff = (todayTime - startTime) / msInDay;
const getDateString = date => `${date.getMonth() < 9 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}-${date.getFullYear()}`;

const SecondPage = () => {
    const [chartWidth, setChartWidth] = useState(320);
    const [loading, setLoading] = useState(0);
    const [covidData, setCovidData] = useState([]);
    const [primaryCountry, setPrimaryCountry] = useState('US');
    const [primaryProvinces, setPrimaryProvinces] = useState([]);
    const [primaryProvince, setPrimaryProvince] = useState('All');
    const [primaryMetric, setPrimaryMetric] = useState('confirmed');
    const [primaryChartData, setPrimaryChartData] = useState([]);
    const [primaryTotals, setPrimaryTotals] = useState('daily');

    const curatePrimaryChartData = props => {
        const args = {
            sample: props.data || covidData,
            country: props.country || primaryCountry,
            province: props.province || primaryProvince,
            metric: props.metric || primaryMetric,
            totals: props.totals || primaryTotals
        };
        let data = args.sample.reduce((agg, item) => {
            if (item.country !== args.country) return agg;
            if (args.province !== 'All' && item.province !== args.province) return agg;
            if (typeof item.date !== 'string') item.date = `${item.date.getMonth() + 1}/${item.date.getDate()}`;
            const index = agg.findIndex(a => a.date === item.date);
            if (index >= 0) return [...agg.slice(0, index), { ...agg[index], [args.metric]: agg[index][args.metric] + parseInt(item[args.metric]) }];
            const obj = { date: item.date, country: item.country, [args.metric]: parseInt(item[args.metric]) || 0 };
            if (args.province) obj.province = item.province;
            return [...agg, obj];
        }, []);
        if (args.totals === 'cumulative') return setPrimaryChartData(data);
        data = data.map((item, i, arr) => (i === 0 ? item : { ...item, [args.metric]: (item[args.metric] - arr[i - 1][args.metric]) || 0 }));
        setPrimaryChartData(data);
    };

    useEffect(() => {
        const fetchData = async () => {
            const allData = [];
            for (let i = 1; i <= Math.floor(diff); i += 1) {
                const date = new Date(startTime + i * msInDay);
                const res = await fetch(`https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${getDateString(date)}.csv`);
                const text = await res.text();
                const initialArr = await new Promise(resolve => parse(text, (err, data) => resolve(convertToArrayOfObjects(data))));
                const arr = initialArr.map(item => ({
                    date,
                    country: item['Country/Region'].includes('China') ? 'China' : item['Country/Region'],
                    province: item['Province/State'],
                    confirmed: item['Confirmed'],
                    recovered: item['Recovered'],
                    deaths: item['Deaths'],
                }));
                allData.push(...arr);
                setCovidData(agg => ([...agg, ...arr]));
                setLoading(Math.floor(i / Math.floor(diff) * 100));
                if (i === Math.floor(diff)) {
                    const provinces = allData.reduce((agg, item) => (item.country === primaryCountry && !agg.includes(item.province) && item.province !== '' ? [...agg, item.province] : agg), []);
                    setPrimaryProvinces(provinces);
                    curatePrimaryChartData({ data: allData });
                };
            }
        }
        fetchData();
    }, []);

    useEffect(() => setChartWidth(window.innerWidth > 940 ? 900 : window.innerWidth - 40));

    const countries = covidData
        .reduce((agg, item) => (agg.includes(item.country) ? agg : [...agg, item.country]), [])
        .sort()
        .map(country => <option key={country}>{country}</option>);
    
    const _handlePrimaryCountryChange = e => {
        setPrimaryCountry(e.target.value);
        const provinces = covidData.reduce((agg, item) => (item.country === e.target.value && !agg.includes(item.province) && item.province !== '' ? [...agg, item.province] : agg), []);
        setPrimaryProvinces(provinces);
        setPrimaryProvince('All');
        curatePrimaryChartData({ country: e.target.value, province: 'All' });
    };

    const primaryProvinceOptions = primaryProvinces
        .sort()
        .map(province => <option key={province}>{province}</option>);

    const _handlePrimaryProvinceChange = e => {
        setPrimaryProvince(e.target.value);
        curatePrimaryChartData({ province: e.target.value });
    };

    const _handlePrimaryMetricChange = e => {
        setPrimaryMetric(e.target.value);
        curatePrimaryChartData({ metric: e.target.value });
    };

    const _handlePrimaryTotalsChange = e => {
        setPrimaryTotals(e.target.value);
        curatePrimaryChartData({ totals: e.target.value });
    };

    return (
        <Layout>
            <SEO title="COVID-19 Graph" />
            <h1>Coronavirus Data Playground</h1>
            {loading < 100 && <p>Data loading {loading}% complete</p> || (
                <div>
                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: chartWidth === 900 ? 'no-wrap' : 'wrap', justifyContent: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 450, width: chartWidth === 900 ? (primaryProvinces.length && '25%' || '33%') : '100%', padding: '10px' }}>
                            <label>Region:</label>
                            <select onChange={_handlePrimaryCountryChange} defaultValue={primaryCountry}>
                                <option>Please select a country</option>
                                {countries}
                            </select>
                        </div>
                        {primaryProvinces.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 450, width: chartWidth === 900 ? (primaryProvinces.length && '25%' || '33%') : '100%', padding: '10px' }}>
                                <label>Subregion:</label>
                                <select onChange={_handlePrimaryProvinceChange}>
                                    <option>All</option>
                                    {primaryProvinceOptions}
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 450, width: chartWidth === 900 ? (primaryProvinces.length && '25%' || '33%') : '100%', padding: '10px' }}>
                            <label>Metric:</label>
                            <select onChange={_handlePrimaryMetricChange}>
                                <option value="confirmed">Confirmed</option>
                                <option value="recovered">Recovered</option>
                                <option value="deaths">Deaths</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 450, width: chartWidth === 900 ? (primaryProvinces.length && '25%' || '33%') : '100%', padding: '10px' }}>
                            <label>Totals:</label>
                            <select onChange={_handlePrimaryTotalsChange}>
                                <option value="daily">Daily</option>
                                <option value="cumulative">Cumulative</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
            {primaryChartData.length > 0 && (
                <LineChart width={chartWidth} height={chartWidth / 2} data={primaryChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Line dataKey={primaryMetric} stroke="rebeccapurple" dot={false} />
                    <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                </LineChart>
            ) || <div style={{ width: `${chartWidth}px`, height: `${chartWidth / 2}px`, backgroundColor: '#eee' }}/>}
            <p style={{ marginTop: '20px' }}>Data provided by <a href="https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_daily_reports" target="_blank">CSSE at Johns Hopkins University</a></p>
        </Layout>
    )
}

export default SecondPage
