# FIREシミュレーション差分の調査メモ（再調査）

## 1) いただいた2つのJSONから見える事実
同条件比較とありますが、実際には以下の差が含まれています。

- 旧アプリ結果: `requiredAssetsAtFireYen=140,710,558`, `fireAchievementMonth=78`, `fireAchievementAge=52`
- このアプリ結果: `requiredAssetsAtFireYen=183,712,080`, `fireAchievementMonth=118`, `fireAchievementAge=55`

また、このアプリ側JSONには `householdType: "family"` と `pensionConfig`（新キー）が明示され、旧JSONには説明文として「娘名義資産の除外」が含まれています。

## 2) 主要因（最も影響が大きい）

### A. 住宅ローン完済イベントが効いていない（`mortgageMonthlyPayment=0` 問題）
このアプリでは `mortgageMonthlyPayment` の初期値が `0` で、そのままシミュレーション入力に渡されます。

- ViewModel初期値: `const mortgageMonthlyPayment = ref(0);`
- シミュレーション入力: `mortgageMonthlyPayment: mortgageMonthlyPayment.value`

さらに、エンジン側の支出計算は `mortgageMonthlyPayment` が0だと「完済後に差し引くローン返済額」が存在しないため、`mortgagePayoffDate` だけ指定しても実質的な支出低下が発生しません。

このため、旧アプリ（ローン返済額を内部推定していた運用）と比べて、将来支出が高く残り、FIRE達成が遅れる方向に強く働きます。

#### 再現実験（本リポジトリで実施）
同一ベース条件で `mortgageMonthlyPayment` だけ変えると、FIRE月が大きく動きます。

- `0円` -> `fireMonth=90`（52歳）
- `50,000円` -> `fireMonth=81`
- `100,000円` -> `fireMonth=72`
- `150,000円` -> `fireMonth=64`

つまり、ローン月額の有無/設定値だけで「数年単位」の差が出ることを確認できました。

## 3) 副次要因

### B. 年金額の差は「原因」より「結果」に近い
このアプリでは年金が `fireAge` に依存し、FIREが遅いほど将来厚生年金の見込みが増えます。
そのため、今回の `122,249円/月 -> 130,229円/月` は、主因ではなく「FIRE年齢が52→55に遅れたことに伴う二次的差分」です。

### C. 旧アプリ説明にある「娘名義資産の除外」文言がこのアプリでは出ない
旧アプリ説明には娘名義資産除外が明記されていますが、このアプリの説明生成にはその記述がありません。
ただし、今回提示値では `totalFinancialAssetsYen` 自体が両者同値のため、今回ケースで最も効いている差はA（ローン月額未設定）です。

## 4) 結論
今回の差分（52歳→55歳、必要資産 1.4億→1.84億）の**主因は、`mortgagePayoffDate` があっても `mortgageMonthlyPayment` が0のため、ローン完済による支出低下がシミュレーションに反映されていないこと**です。

旧アプリと同等化するには、少なくとも以下が必要です。
1. 旧アプリ同様にローン月額を推定入力する、または
2. 比較時に同一の `mortgageMonthlyPayment` を明示的に固定する。

