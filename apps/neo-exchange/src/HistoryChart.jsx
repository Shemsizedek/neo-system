import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

const labels={60:'1m',300:'5m',900:'15m',3600:'1H',14400:'4H',86400:'1D',604800:'1W'};
export default function HistoryChart({ apiBase='', pair='BTC/XCP', timeframe=14400, indicator='SMA' }) {
  const host=useRef(null);
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const [base,quote]=pair.split('/');
    if(!base||!quote)return;
    const ctrl=new AbortController();
    setData(null);setError('');
    fetch(`${apiBase}/api/neo-exchange/history?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}&timeframe=${timeframe}`,{signal:ctrl.signal})
      .then(r=>{if(!r.ok)throw Error(`History API HTTP ${r.status}`);return r.json()})
      .then(d=>{if(!ctrl.signal.aborted)setData(d)})
      .catch(e=>{if(!ctrl.signal.aborted)setError(e.message)});
    return()=>ctrl.abort();
  },[apiBase,pair,timeframe]);

  useEffect(()=>{
    if(!host.current||!data?.candles?.length)return;
    const node=host.current;
    const chart=createChart(node,{
      width:node.clientWidth,height:340,
      layout:{background:{color:'#060b08'},textColor:'#789384'},
      grid:{vertLines:{color:'#142519'},horzLines:{color:'#142519'}},
      timeScale:{timeVisible:true,secondsVisible:false},
      rightPriceScale:{borderColor:'#1e3525'}
    });
    const series=chart.addSeries(CandlestickSeries,{upColor:'#2dff88',downColor:'#ff626f',wickUpColor:'#2dff88',wickDownColor:'#ff626f',borderVisible:false});
    series.setData(data.candles.map(c=>({time:c.time,open:c.open,high:c.high,low:c.low,close:c.close})));
    if(indicator==='SMA'||indicator==='EMA'){
      const line=chart.addSeries(LineSeries,{color:'#f4c467',lineWidth:2,priceLineVisible:false});
      line.setData((data.indicators||[]).filter(x=>x[indicator.toLowerCase()]!==null).map(x=>({time:x.time,value:x[indicator.toLowerCase()]})));
    }
    chart.timeScale().fitContent();
    const resize=typeof ResizeObserver!=='undefined' ? new ResizeObserver(()=>chart.applyOptions({width:node.clientWidth})) : null;
    resize?.observe(node);
    return()=>{resize?.disconnect();chart.remove()};
  },[data,indicator]);

  return <div className="verified-chart">
    <div className="chart-meta">{data?.status||'AWAITING HISTORY API'} · {labels[timeframe]} · {data?.coverage?.verified_matches ?? '—'} VERIFIED MATCHES · {indicator}{indicator==='RSI'?' (RSI BELOW)':''}</div>
    {data?.candles?.length ? <div ref={host} className="chart-canvas" aria-label={`${pair} verified historical candlestick chart`}/> :
      <div className="chart-history-empty">{error || (!data ? 'Loading verified trade history…':'No completed, timestamped matches available. No candles fabricated.')}</div>}
    {indicator==='RSI' && data?.indicators?.length ? <div className="chart-rsi">RSI(14): {data.indicators.at(-1)?.rsi==null?'Insufficient history':data.indicators.at(-1).rsi.toFixed(2)} · Calculated from completed-match closing prices</div>:null}
    <div className="chart-footnote">Source: {data?.source||'Counterparty API connection required'} · Coverage: {data?.coverage?.complete_lifetime_history?'FULL':'PARTIAL / PAGINATED'} · Execution disabled</div>
  </div>;
}
