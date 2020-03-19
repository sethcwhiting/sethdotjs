import React, { useEffect, useState } from 'react';
import parse from 'csv-parse';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

import Layout from '../components/layout';
import SEO from '../components/seo';
import { filterCountry, filterProvince } from '../utilities/regionFilter';

const styles = {
    fieldWrap: {
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '450px',
        padding: '10px',
    },
};

function convertToArrayOfObjects(data) {
    const keys = data.shift();
    let i = 0;
    let k = 0;
    let obj = null;
    const output = [];
    for (i = 0; i < data.length; i += 1) {
        obj = {};
        for (k = 0; k < keys.length; k += 1) obj[keys[k]] = data[i][k];
        output.push(obj);
    }
    return output;
}

const msInDay = 1000 * 60 * 60 * 24;
const startTime = new Date('2020-01-22').getTime();
const now = new Date();
const todayTime = new Date(
    `${now.getFullYear()}-${now.getMonth() < 9 ? `0${now.getMonth() + 1}` : now.getMonth() + 1}-${now.getDate() < 10 ? `0${now.getDate()}` : now.getDate()}`
).getTime();
const diff = (todayTime - startTime) / msInDay;
const getDateString = date =>
    `${date.getMonth() < 9 ? `0${date.getMonth() + 1}` : date.getMonth() + 1}-${
        date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
    }-${date.getFullYear()}`;

const SecondPage = () => {
    const [chartWidth, setChartWidth] = useState(320);
    const [loading, setLoading] = useState(0);
    const [covidData, setCovidData] = useState([]);
    const [primaryCountry, setPrimaryCountry] = useState('United States');
    const [primaryProvinces, setPrimaryProvinces] = useState([]);
    const [primaryProvince, setPrimaryProvince] = useState('All');
    const [primaryMetric, setPrimaryMetric] = useState('Confirmed');
    const [chartData, setChartData] = useState([]);
    const [primaryTotals, setPrimaryTotals] = useState('daily');
    const [secondaryCountry, setSecondaryCountry] = useState('Italy');
    const [secondaryProvinces, setSecondaryProvinces] = useState([]);
    const [secondaryProvince, setSecondaryProvince] = useState('All');
    const [secondaryMetric, setSecondaryMetric] = useState('Confirmed');
    const [secondaryTotals, setSecondaryTotals] = useState('daily');

    const curateChartData = props => {
        const args = {
            sample: props.data || covidData,
            primaryCountry: props.primaryCountry || primaryCountry,
            primaryProvince: props.primaryProvince || primaryProvince,
            primaryMetric: props.primaryMetric || primaryMetric,
            primaryTotals: props.primaryTotals || primaryTotals,
            secondaryCountry: props.secondaryCountry || secondaryCountry,
            secondaryProvince: props.secondaryProvince || secondaryProvince,
            secondaryMetric: props.secondaryMetric || secondaryMetric,
            secondaryTotals: props.secondaryTotals || secondaryTotals,
        };
        const primaryRegion = args.primaryProvince === 'All' ? args.primaryCountry : args.primaryProvince;
        const secondaryRegion = args.secondaryProvince === 'All' ? args.secondaryCountry : args.secondaryProvince;
        let primaryLabel = `${args.primaryMetric} in ${primaryRegion}`;
        let secondaryLabel = `${args.secondaryMetric} in ${secondaryRegion}`;
        const same = primaryRegion === secondaryRegion;
        primaryLabel += same ? '-1' : '';
        secondaryLabel += same ? '-2' : '';
        let data = args.sample.reduce((agg, item) => {
            const primaryConditionsMet = item.province === args.primaryProvince || item.country === args.primaryCountry || primaryRegion === 'All';
            const secondaryConditionsMet = item.province === args.secondaryProvince || item.country === args.secondaryCountry || secondaryRegion === 'All';
            if (!primaryConditionsMet && !secondaryConditionsMet) return agg;
            if (typeof item.date !== 'string') item.date = `${item.date.getMonth() + 1}/${item.date.getDate()}`;
            const index = agg.findIndex(a => a.date === item.date);
            let obj = { [primaryLabel]: 0, [secondaryLabel]: 0 };
            if (index >= 0) {
                obj = { ...obj, ...agg[index] };
                if (primaryConditionsMet) obj[primaryLabel] = agg[index][primaryLabel] + (parseInt(item[args.primaryMetric]) || 0);
                if (secondaryConditionsMet) obj[secondaryLabel] = agg[index][secondaryLabel] + (parseInt(item[args.secondaryMetric]) || 0);
                return [...agg.slice(0, index), obj, ...agg.slice(index + 1)];
            }
            obj.date = item.date;
            if (primaryConditionsMet) obj[primaryLabel] = parseInt(item[args.primaryMetric]) || 0;
            if (secondaryConditionsMet) obj[secondaryLabel] = parseInt(item[args.secondaryMetric]) || 0;
            return [...agg, obj];
        }, []);
        if (args.primaryTotals === 'cumulative' && args.secondaryTotals === 'cumulative') return setChartData(data);
        if (args.primaryTotals === 'daily')
            data = data.map((item, i, arr) => {
                if (i === 0) return item;
                const dailyDiff = item[primaryLabel] - arr[i - 1][primaryLabel];
                return { ...item, [primaryLabel]: dailyDiff > 0 ? dailyDiff : 0 };
            });
        if (args.secondaryTotals === 'daily')
            data = data.map((item, i, arr) => {
                if (i === 0) return item;
                const dailyDiff = item[secondaryLabel] - arr[i - 1][secondaryLabel];
                return { ...item, [secondaryLabel]: dailyDiff > 0 ? dailyDiff : 0 };
            });
        if (same) console.log(data);
        setChartData(data);
    };

    useEffect(() => {
        const fetchData = async () => {
            const allData = [];
            for (let i = 1; i <= Math.floor(diff); i += 1) {
                const date = new Date(startTime + i * msInDay);
                const res = await fetch(
                    `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${getDateString(date)}.csv`
                );
                const text = await res.text();
                const initialArr = await new Promise(resolve => parse(text, (err, data) => resolve(convertToArrayOfObjects(data))));
                const arr = initialArr.map(item => {
                    const country = filterCountry(item['Country/Region']);
                    const province = filterProvince(item['Province/State']);
                    return { date, country, province, Confirmed: item.Confirmed, Recovered: item.Recovered, deaths: item.Deaths };
                });
                allData.push(...arr);
                setCovidData(agg => [...agg, ...arr]);
                setLoading(Math.floor((i / Math.floor(diff)) * 100));
                if (i === Math.floor(diff)) {
                    const provinces = allData.reduce(
                        (agg, item) =>
                            item.country === primaryCountry && !agg.includes(item.province) && item.province !== '' ? [...agg, item.province] : agg,
                        []
                    );
                    setPrimaryProvinces(provinces);
                    curateChartData({ data: allData });
                }
            }
        };
        fetchData();
    }, []);

    useEffect(() => setChartWidth(window.innerWidth > 940 ? 900 : window.innerWidth - 40));

    const countries = covidData
        .reduce((agg, item) => (agg.includes(item.country) ? agg : [...agg, item.country]), [])
        .sort()
        .map(country => <option key={country}>{country}</option>);

    const _handlePrimaryCountryChange = e => {
        setPrimaryCountry(e.target.value);
        const provinces = covidData.reduce(
            (agg, item) => (item.country === e.target.value && !agg.includes(item.province) && item.province !== '' ? [...agg, item.province] : agg),
            []
        );
        setPrimaryProvinces(provinces);
        setPrimaryProvince('All');
        curateChartData({ primaryCountry: e.target.value, province: 'All' });
    };

    const primaryProvinceOptions = primaryProvinces.sort().map(province => <option key={province}>{province}</option>);

    const _handlePrimaryProvinceChange = e => {
        setPrimaryProvince(e.target.value);
        curateChartData({ primaryProvince: e.target.value });
    };

    const _handlePrimaryMetricChange = e => {
        setPrimaryMetric(e.target.value);
        curateChartData({ primaryMetric: e.target.value });
    };

    const _handlePrimaryTotalsChange = e => {
        setPrimaryTotals(e.target.value);
        curateChartData({ primaryTotals: e.target.value });
    };

    const _handleSecondaryCountryChange = e => {
        setSecondaryCountry(e.target.value);
        const provinces = covidData.reduce(
            (agg, item) => (item.country === e.target.value && !agg.includes(item.province) && item.province !== '' ? [...agg, item.province] : agg),
            []
        );
        setSecondaryProvinces(provinces);
        setSecondaryProvince('All');
        curateChartData({ secondaryCountry: e.target.value, province: 'All' });
    };

    const secondaryProvinceOptions = secondaryProvinces.sort().map(province => <option key={province}>{province}</option>);

    const _handleSecondaryProvinceChange = e => {
        setSecondaryProvince(e.target.value);
        curateChartData({ secondaryProvince: e.target.value });
    };

    const _handleSecondaryMetricChange = e => {
        setSecondaryMetric(e.target.value);
        curateChartData({ secondaryMetric: e.target.value });
    };

    const _handleSecondaryTotalsChange = e => {
        setSecondaryTotals(e.target.value);
        curateChartData({ secondaryTotals: e.target.value });
    };

    return (
        <Layout>
            <SEO title="COVID-19 Graph" />
            <h1>Interactive Coronavirus Data Visualization</h1>
            {(chartData.length > 0 && (
                <LineChart width={chartWidth} height={chartWidth / 2} data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Line dataKey={`${primaryMetric} in ${primaryProvince === 'All' ? primaryCountry : primaryProvince}`} stroke="rebeccapurple" dot={false} />
                    <Line
                        dataKey={`${secondaryMetric} in ${secondaryProvince === 'All' ? secondaryCountry : secondaryProvince}`}
                        stroke="#009387"
                        dot={false}
                    />
                    <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                </LineChart>
            )) || (
                <div
                    style={{
                        width: `${chartWidth}px`,
                        height: `${chartWidth / 2}px`,
                        backgroundColor: '#eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <p style={{ margin: 0, color: '#444' }}>Data loading {loading}% complete...</p>
                </div>
            )}
            {loading === 100 && (
                <div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: chartWidth === 900 ? 'no-wrap' : 'wrap',
                            justifyContent: chartWidth === 900 ? 'flex-start' : 'center',
                            marginTop: 20,
                            borderLeft: '8px solid rebeccapurple',
                        }}
                    >
                        <div style={{ ...styles.fieldWrap, width: chartWidth === 900 ? '25%' : '100%' }}>
                            <label htmlFor="primaryCountrySelect" style={{ display: 'flex', flexDirection: 'column' }}>
                                Region:
                                <select id="primaryCountrySelect" onChange={_handlePrimaryCountryChange} defaultValue={primaryCountry}>
                                    <option>All</option>
                                    {countries}
                                </select>
                            </label>
                        </div>
                        <div style={{ ...styles.fieldWrap, width: chartWidth === 900 ? '25%' : '100%' }}>
                            {/* eslint-disable-next-line jsx-a11y/label-has-for */}
                            <label htmlFor="primaryProvinceSelect" style={{ display: 'flex', flexDirection: 'column' }}>
                                Subregion:
                                {(primaryProvinces.length > 0 && (
                                    <select id="primaryProvinceSelect" onChange={_handlePrimaryProvinceChange}>
                                        <option>All</option>
                                        {primaryProvinceOptions}
                                    </select>
                                )) || <p style={{ margin: 0, color: '#999' }}>N/A</p>}
                            </label>
                        </div>
                        <div style={{ ...styles.fieldWrap, width: chartWidth === 900 ? '25%' : '100%' }}>
                            <label htmlFor="primaryMetricSelect" style={{ display: 'flex', flexDirection: 'column' }}>
                                Metric:
                                <select id="primaryMetricSelect" onChange={_handlePrimaryMetricChange}>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Recovered">Recovered</option>
                                    <option value="deaths">Deaths</option>
                                </select>
                            </label>
                        </div>
                        <div style={{ ...styles.fieldWrap, width: chartWidth === 900 ? '25%' : '100%' }}>
                            <label htmlFor="primaryTotalsSelect" style={{ display: 'flex', flexDirection: 'column' }}>
                                Totals:
                                <select id="primaryTotalsSelect" onChange={_handlePrimaryTotalsChange}>
                                    <option value="daily">Daily</option>
                                    <option value="cumulative">Cumulative</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: chartWidth === 900 ? 'no-wrap' : 'wrap',
                            justifyContent: chartWidth === 900 ? 'flex-start' : 'center',
                            marginTop: 8,
                            marginBottom: 20,
                            borderLeft: '8px solid #009387',
                        }}
                    >
                        <div style={{ ...styles.fieldWrap, width: chartWidth === 900 ? '25%' : '100%' }}>
                            <label htmlFor="secondaryCountrySelect" style={{ display: 'flex', flexDirection: 'column' }}>
                                Region:
                                <select id="secondaryCountrySelect" onChange={_handleSecondaryCountryChange} defaultValue={secondaryCountry}>
                                    <option>All</option>
                                    {countries}
                                </select>
                            </label>
                        </div>
                        <div style={{ ...styles.fieldWrap, width: chartWidth === 900 ? '25%' : '100%' }}>
                            {/* eslint-disable-next-line jsx-a11y/label-has-for */}
                            <label htmlFor="secondaryProvinceSelect" style={{ display: 'flex', flexDirection: 'column' }}>
                                Subregion:
                                {(secondaryProvinces.length > 0 && (
                                    <select id="secondaryProvinceSelect" onChange={_handleSecondaryProvinceChange}>
                                        <option>All</option>
                                        {secondaryProvinceOptions}
                                    </select>
                                )) || <p style={{ margin: 0, color: '#999' }}>N/A</p>}
                            </label>
                        </div>
                        <div style={{ ...styles.fieldWrap, width: chartWidth === 900 ? '25%' : '100%' }}>
                            <label htmlFor="secondaryMetricSelect" style={{ display: 'flex', flexDirection: 'column' }}>
                                Metric:
                                <select id="secondaryMetricSelect" onChange={_handleSecondaryMetricChange}>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Recovered">Recovered</option>
                                    <option value="deaths">Deaths</option>
                                </select>
                            </label>
                        </div>
                        <div style={{ ...styles.fieldWrap, width: chartWidth === 900 ? '25%' : '100%' }}>
                            <label htmlFor="secondaryTotalsSelect" style={{ display: 'flex', flexDirection: 'column' }}>
                                Totals:
                                <select id="secondaryTotalsSelect" onChange={_handleSecondaryTotalsChange}>
                                    <option value="daily">Daily</option>
                                    <option value="cumulative">Cumulative</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>
            )}
            <p style={{ marginTop: '20px' }}>
                Data provided by{' '}
                <a
                    href="https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_daily_reports"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    CSSE at Johns Hopkins University
                </a>
            </p>
        </Layout>
    );
};

export default SecondPage;
