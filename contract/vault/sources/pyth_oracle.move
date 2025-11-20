module vault::pyth_oracle {
    use pyth::price_info::{Self, PriceInfo, PriceInfoObject};

    const EPriceNotUpdated: u64 = 0;
    const EInvalidOraclePrice: u64 = 1;
    const PYTH_PRICE_DECIMAL: u8 = 10;
    
    // fun init(ctx: &mut sui::tx_context::TxContext) {
    //     let pyth_oracle = PythOracle{ 
    //         id               : sui::object::new(ctx), 
    //         update_price_fee : sui::balance::zero<sui::sui::SUI>(), 
    //         prices           : sui::table::new<std::type_name::TypeName, Price>(ctx), 
    //         oracle_infos     : sui::table::new<std::type_name::TypeName, OracleInfo>(ctx),
    //     };
    //     let event = InitEvent{pyth_oracle_id: sui::object::id<PythOracle>(&pyth_oracle)};
    //     sui::event::emit<InitEvent>(event);
    //     sui::transfer::share_object<PythOracle>(pyth_oracle);
    // }

    public fun get_price_from_pyth_oracle(
        // pyth_oracle: &mut PythOracle, 
        // global_config: &vault::vault_config::GlobalConfig, 
        price_info_object: &PriceInfoObject,
        price_age: u64,
        clock: &sui::clock::Clock
    ) : u64 {
        // let type_name = std::type_name::with_defining_ids<CoinType>();

        // let oracle_info = pyth_oracle.oracle_infos.borrow(type_name);
        let price_info = price_info_object.get_price_info_from_price_info_object();
        let price_feed_ref = price_info.get_price_feed();
        let price_timestamp = price_feed_ref.get_price().get_timestamp();
        let now = sui::clock::timestamp_ms(clock) / 1000;
        let delta = if (now >= price_timestamp) { now - price_timestamp } else { 0 };
        assert!(delta <= price_age, EPriceNotUpdated);

        pyth_price_from_oracle_info(price_info_object, price_age, clock)
    }

    public fun pyth_price_from_oracle_info(
        price_info_object: &PriceInfoObject, 
        // oracle_info: &OracleInfo, 
        price_age: u64,
        clock: &sui::clock::Clock
    ) : u64 {
        let price = pyth::pyth::get_price_no_older_than(price_info_object, clock, price_age);
        // let price_info = price_info_object.get_price_info_from_price_info_object();
        // let price_identifier = price_info.get_price_identifier();
        // assert!(oracle_info.price_feed_id == price_identifier.get_bytes(), vault::error::invalid_price_feed_id()); 
        let expo = price.get_expo(); 
        let price_value = price.get_price(); 
        let magnitude = if (price_value.get_is_negative()) {
            price_value.get_magnitude_if_negative()
        } else {
            price_value.get_magnitude_if_positive()
        };
        assert!(magnitude != 0, EInvalidOraclePrice);
        let price = if (expo.get_is_negative()) {
            let expo_magnitude = (expo.get_magnitude_if_negative() as u8);
            if (expo_magnitude < PYTH_PRICE_DECIMAL) {
                magnitude * std::u64::pow(10, PYTH_PRICE_DECIMAL - expo_magnitude)
            } else {
                magnitude / std::u64::pow(10, expo_magnitude - PYTH_PRICE_DECIMAL)
            }
        } else {
            magnitude * std::u64::pow(10, (expo.get_magnitude_if_positive() as u8) + PYTH_PRICE_DECIMAL)
        };
        price
    }

}