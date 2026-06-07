-- v3: 폐원 모드는 closed_date 기준 연/월로 매칭 (year_group은 license_date 기준이라 폐원 조회시 부정확했음)
CREATE OR REPLACE FUNCTION get_map_clinics_json(
  p_years TEXT[], p_specialty TEXT DEFAULT '',
  p_map_mode TEXT DEFAULT 'open', p_facility_type TEXT DEFAULT '의원'
)
RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE v_expanded TEXT[]; v_year TEXT; v_short TEXT; v_m INT;
BEGIN
  v_expanded := ARRAY[]::TEXT[];
  FOREACH v_year IN ARRAY p_years LOOP
    IF v_year ~ '^[0-9]{4}$' AND v_year::INT >= 2026 THEN
      v_short := SUBSTRING(v_year FROM 3);
      FOR v_m IN 1..12 LOOP v_expanded := v_expanded || (v_short || '.' || v_m::TEXT); END LOOP;
    ELSE v_expanded := v_expanded || v_year; END IF;
  END LOOP;

  RETURN (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT mr.mogaha_id, mr.license_date, mr.name, mr.address, mr.region1, mr.region2,
           mr.specialty, mr.staff_count, mr.area_pyeong, mr.lat, mr.lng, mr.is_closed,
           mr.closed_date, mr.is_transfer, mr.transfer_date, mr.year_group
    FROM mogaha_registry mr
    WHERE mr.facility_type = p_facility_type
      AND mr.lat IS NOT NULL AND mr.lng IS NOT NULL
      AND (p_specialty = '' OR mr.specialty = p_specialty)
      AND (
        -- 개원/전체 모드: 기존처럼 year_group(개원일 기준) 매칭
        (p_map_mode <> 'closed' AND mr.year_group = ANY(v_expanded))
        OR
        -- 폐원 모드: closed_date의 연/월을 year_group과 같은 포맷으로 변환해 매칭
        (p_map_mode = 'closed' AND mr.closed_date IS NOT NULL AND
          (
            CASE WHEN EXTRACT(YEAR FROM mr.closed_date) >= 2026
              THEN SUBSTRING(EXTRACT(YEAR FROM mr.closed_date)::TEXT FROM 3)
                   || '.' || EXTRACT(MONTH FROM mr.closed_date)::INT::TEXT
              ELSE EXTRACT(YEAR FROM mr.closed_date)::INT::TEXT
            END
          ) = ANY(v_expanded)
        )
      )
      AND ((p_map_mode = 'open' AND mr.is_closed = FALSE) OR
           (p_map_mode = 'closed' AND mr.is_closed = TRUE) OR (p_map_mode = 'all'))
  ) t);
END; $$;

GRANT EXECUTE ON FUNCTION get_map_clinics_json(TEXT[], TEXT, TEXT, TEXT) TO anon, authenticated;
