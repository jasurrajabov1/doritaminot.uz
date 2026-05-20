from pathlib import Path

path = Path("core/views.py")
text = path.read_text(encoding="utf-8")

old1 = '''        total_remaining_sum = total_need_sum - total_issued_sum

        institution_data = []'''

new1 = '''        total_remaining_sum = total_need_sum - total_issued_sum

        total_need_qty = total_need_sum
        total_issued_qty = total_issued_sum
        total_remaining_qty = total_remaining_sum

        total_yearly_amount = 0
        total_issued_amount = 0
        total_remaining_amount = 0

        institution_data = []'''

if old1 in text and "total_yearly_amount = 0" not in text:
    text = text.replace(old1, new1, 1)
    print("1-qism qo'shildi")
else:
    print("1-qism allaqachon bor yoki topilmadi")

old2 = '''            remaining = total_need - issued_total

            remaining_percent = 0'''

new2 = '''            remaining = total_need - issued_total

            matched_price = get_latest_price(need.drug_id, year=need.year)
            price_value = matched_price.price if matched_price else None

            if price_value is not None:
                total_yearly_amount += total_need * price_value
                total_issued_amount += issued_total * price_value
                total_remaining_amount += remaining * price_value

            remaining_percent = 0'''

if old2 in text and "total_yearly_amount += total_need * price_value" not in text:
    text = text.replace(old2, new2, 1)
    print("2-qism qo'shildi")
else:
    print("2-qism allaqachon bor yoki topilmadi")

old3 = '''                "total_need_sum": float(total_need_sum),
                "total_issued_sum": float(total_issued_sum),
                "total_remaining_sum": float(total_remaining_sum),'''

new3 = '''                "total_need_qty": float(total_need_qty),
                "total_issued_qty": float(total_issued_qty),
                "total_remaining_qty": float(total_remaining_qty),

                "total_need_sum": float(total_yearly_amount),
                "total_issued_sum": float(total_issued_amount),
                "total_remaining_sum": float(total_remaining_amount),'''

if old3 in text:
    text = text.replace(old3, new3, 1)
    print("3-qism almashtirildi")
else:
    print("3-qism topilmadi yoki allaqachon almashtirilgan")

path.write_text(text, encoding="utf-8")
print("Dashboard summary patch tugadi")
