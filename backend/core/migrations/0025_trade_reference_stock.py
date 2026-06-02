# Generated manually for professional trade/reference price extensions.
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0024_performance_indexes"),
    ]

    operations = [
        migrations.CreateModel(
            name="Supplier",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(db_index=True, max_length=255)),
                ("inn", models.CharField(blank=True, db_index=True, default="", max_length=20)),
                ("license_no", models.CharField(blank=True, default="", max_length=120)),
                ("phone", models.CharField(blank=True, default="", max_length=80)),
                ("address", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="TradeBranch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(db_index=True, max_length=255)),
                ("branch_type", models.CharField(choices=[("warehouse", "Улгуржи омбор"), ("retail", "Чакана дорихона")], db_index=True, default="warehouse", max_length=20)),
                ("address", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["branch_type", "name"]},
        ),
        migrations.CreateModel(
            name="ReferencePrice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("price_type", models.CharField(choices=[("wholesale_vat", "Улгуржи НДС билан"), ("wholesale_no_vat", "Улгуржи НДСсиз"), ("retail_vat", "Чакана НДС билан"), ("retail_no_vat", "Чакана НДСсиз")], db_index=True, max_length=30)),
                ("price", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("currency", models.CharField(default="UZS", max_length=10)),
                ("source_doc", models.CharField(blank=True, default="", max_length=255)),
                ("start_date", models.DateField(db_index=True)),
                ("is_limited", models.BooleanField(default=True, help_text="False бўлса референт чеклов ўрнатилмаган.")),
                ("is_active", models.BooleanField(default=True)),
                ("note", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("drug", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="reference_prices", to="core.drug")),
            ],
            options={"ordering": ["-start_date", "drug__name", "price_type"]},
        ),
        migrations.CreateModel(
            name="StockBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("series", models.CharField(blank=True, db_index=True, default="", max_length=120)),
                ("expiry_date", models.DateField(blank=True, db_index=True, null=True)),
                ("quantity", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("purchase_price", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("wholesale_price", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("retail_price", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("is_quarantine", models.BooleanField(db_index=True, default=False)),
                ("is_recalled", models.BooleanField(db_index=True, default=False)),
                ("note", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="stock_batches", to="core.tradebranch")),
                ("drug", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="stock_batches", to="core.drug")),
                ("supplier", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="stock_batches", to="core.supplier")),
            ],
            options={"ordering": ["drug__name", "expiry_date", "series"]},
        ),
        migrations.AddConstraint(
            model_name="supplier",
            constraint=models.UniqueConstraint(condition=models.Q(("inn", ""), _negated=True), fields=("inn",), name="unique_supplier_inn_when_filled"),
        ),
        migrations.AddConstraint(
            model_name="tradebranch",
            constraint=models.UniqueConstraint(fields=("name", "branch_type"), name="uniq_trade_branch_name_type"),
        ),
        migrations.AddConstraint(
            model_name="referenceprice",
            constraint=models.UniqueConstraint(fields=("drug", "price_type", "start_date"), name="uniq_reference_price_drug_type_date"),
        ),
        migrations.AddIndex(
            model_name="stockbatch",
            index=models.Index(fields=["branch", "drug"], name="core_stockb_branch__0f976d_idx"),
        ),
        migrations.AddIndex(
            model_name="stockbatch",
            index=models.Index(fields=["drug", "series"], name="core_stockb_drug_id_c4d69a_idx"),
        ),
        migrations.AddIndex(
            model_name="stockbatch",
            index=models.Index(fields=["expiry_date"], name="core_stockb_expiry__a2e640_idx"),
        ),
    ]
