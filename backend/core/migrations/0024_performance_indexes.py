# Generated manually for performance indexes
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_drug_control_group'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='institution',
            index=models.Index(fields=['inn'], name='idx_inst_inn'),
        ),
        migrations.AddIndex(
            model_name='institution',
            index=models.Index(fields=['name'], name='idx_inst_name'),
        ),
        migrations.AddIndex(
            model_name='institution',
            index=models.Index(fields=['is_active'], name='idx_inst_active'),
        ),
        migrations.AddIndex(
            model_name='drug',
            index=models.Index(fields=['name'], name='idx_drug_name'),
        ),
        migrations.AddIndex(
            model_name='drug',
            index=models.Index(fields=['is_active'], name='idx_drug_active'),
        ),
        migrations.AddIndex(
            model_name='drug',
            index=models.Index(fields=['control_group'], name='idx_drug_ctrlgrp'),
        ),
        migrations.AddIndex(
            model_name='price',
            index=models.Index(fields=['drug'], name='idx_price_drug'),
        ),
        migrations.AddIndex(
            model_name='price',
            index=models.Index(fields=['drug', 'is_active'], name='idx_price_drug_active'),
        ),
        migrations.AddIndex(
            model_name='price',
            index=models.Index(fields=['drug', 'start_date'], name='idx_price_drug_date'),
        ),
        migrations.AddIndex(
            model_name='price',
            index=models.Index(fields=['is_active'], name='idx_price_active'),
        ),
        migrations.AddIndex(
            model_name='needrow',
            index=models.Index(fields=['institution', 'drug', 'year'], name='idx_needrow_inst_drug_year'),
        ),
        migrations.AddIndex(
            model_name='needrow',
            index=models.Index(fields=['institution', 'year'], name='idx_needrow_inst_year'),
        ),
        migrations.AddIndex(
            model_name='needrow',
            index=models.Index(fields=['drug', 'year'], name='idx_needrow_drug_year'),
        ),
        migrations.AddIndex(
            model_name='needrow',
            index=models.Index(fields=['year'], name='idx_needrow_year'),
        ),
        migrations.AddIndex(
            model_name='monthlyissue',
            index=models.Index(fields=['institution', 'drug', 'year'], name='idx_issue_inst_drug_year'),
        ),
        migrations.AddIndex(
            model_name='monthlyissue',
            index=models.Index(fields=['institution', 'year'], name='idx_issue_inst_year'),
        ),
        migrations.AddIndex(
            model_name='monthlyissue',
            index=models.Index(fields=['drug', 'year'], name='idx_issue_drug_year'),
        ),
        migrations.AddIndex(
            model_name='monthlyissue',
            index=models.Index(fields=['year'], name='idx_issue_year'),
        ),
        migrations.AddIndex(
            model_name='needaddition',
            index=models.Index(fields=['need_row'], name='idx_add_needrow'),
        ),
        migrations.AddIndex(
            model_name='needaddition',
            index=models.Index(fields=['need_row', 'is_active'], name='idx_add_needrow_active'),
        ),
        migrations.AddIndex(
            model_name='needaddition',
            index=models.Index(fields=['is_active'], name='idx_add_active'),
        ),
        migrations.AddIndex(
            model_name='needaddition',
            index=models.Index(fields=['institution', 'drug', 'year'], name='idx_add_inst_drug_year'),
        ),
        migrations.AddIndex(
            model_name='needaddition',
            index=models.Index(fields=['institution', 'year'], name='idx_add_inst_year'),
        ),
        migrations.AddIndex(
            model_name='needaddition',
            index=models.Index(fields=['drug', 'year'], name='idx_add_drug_year'),
        ),
        migrations.AddIndex(
            model_name='needaddition',
            index=models.Index(fields=['year'], name='idx_add_year'),
        ),
    ]
