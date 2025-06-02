import moment from 'moment';

const unPackTickSTKv1 = (data) => {
    const [
        code,
        date,
        time,
        open,
        avg_price,
        close,
        high,
        low,
        amount,
        amount_sum,
        volume,
        volsum,
        tick_type,
        diff_type,
        diff_price,
        diff_rate,
        trade_bid_vol_sum,
        trade_ask_vol_sum,
        trade_bid_cnt,
        trade_ask_cnt,
        closing_oddlot_shares,
        closing_oddlot_close,
        closing_oddlot_amount,
        closing_oddlot_bid_price,
        closing_oddlot_ask_price,
        fixed_trade_volume,
        fixed_trade_amount,
        suspend,
        simtrade
    ] = data;

    const validTickType = (tick_type === 0 || tick_type === 1 || tick_type === 2) ? tick_type : 0;
    const validChgType = (diff_type === 0 || diff_type === 1 || diff_type === 2 || diff_type === 3 || diff_type === 4) ? diff_type : 0;

    return {
        code: code,
        time: moment(`${date.replaceAll("/", "-")} ${time}`),
        open: +open,
        high: +high,
        low: +low,
        close: +close,
        volume: volume,
        total_volume: volsum,
        amount: amount,
        total_amount: amount_sum,
        tick_type: validTickType,
        chg_type: validChgType,
        price_chg: +diff_price,
        pct_chg: +diff_rate / 100,
        bid_side_total_vol: trade_bid_vol_sum,
        ask_side_total_vol: trade_ask_vol_sum,
        suspend: suspend,
        simtrade: simtrade,
    };
};



const unPackTickFOPv1 = (data) => {
    const [
        code,
        date,
        time,
        open,
        target_kind_price,
        trade_bid_vol_sum,
        trade_ask_vol_sum,
        avg_price,
        close,
        high,
        low,
        amount,
        amount_sum,
        volume,
        volsum,
        tick_type,
        diff_type,
        diff_price,
        diff_rate,
        simtrade
    ] = data;

    const validTickType = (tick_type === 0 || tick_type === 1 || tick_type === 2) ? tick_type : 0;
    const validChgType = (diff_type === 0 || diff_type === 1 || diff_type === 2 || diff_type === 3 || diff_type === 4) ? diff_type : 0;


    return {
        code: code,
        time: moment(`${date.replaceAll("/", "-")} ${time}`),
        open: +open,
        high: +high,
        low: +low,
        close: +close,
        volume: volume,
        total_volume: volsum,
        amount: +amount,
        total_amount: +amount_sum,
        tick_type: validTickType,
        chg_type: validChgType,
        price_chg: +diff_price,
        pct_chg: +diff_rate,
        bid_side_total_vol: trade_bid_vol_sum,
        ask_side_total_vol: trade_ask_vol_sum,
        suspend: false,
        simtrade: simtrade,
    };
};

const unPackTickIND = (data) => {
    const {
        Code,
        Date,
        Time,
        Open,
        High,
        Low,
        Close,
        Volume,
        VolSum,
        Amount,
        AmountSum,
        DiffType,
        DiffPrice,
        DiffRate,
    } = data;
    return {
        code: Code,
        time: moment(`${Date.replaceAll("/", "-")} ${Time}`),
        open: +Open,
        high: +High,
        low: +Low,
        close: +Close,
        volume: Volume,
        total_volume: VolSum,
        amount: +Amount,
        total_amount: +AmountSum,
        tick_type: 0,
        chg_type: DiffType,
        price_chg: +DiffPrice,
        pct_chg: +DiffRate,
        bid_side_total_vol: null,
        ask_side_total_vol: null,
        suspend: false,
        simtrade: 0,
    };
};


export { unPackTickSTKv1, unPackTickFOPv1, unPackTickIND };

