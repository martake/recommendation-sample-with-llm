import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="language-switcher">
      <label>
        {t('language.label')}:
        <select value={i18n.language} onChange={handleChange}>
          <option value="en">{t('language.en')}</option>
          <option value="ja">{t('language.ja')}</option>
        </select>
      </label>
    </div>
  );
};
