import { useTranslation } from 'react-i18next';
import i18n from '~/i18n/config';

const LANGUAGES = [
	{ code: 'pt-BR', key: 'settings.language.ptBR' as const },
	{ code: 'en', key: 'settings.language.en' as const },
] as const;

export default function SettingsPage() {
	const { t } = useTranslation();

	return (
		<div className="p-4 md:p-[32px] flex flex-col gap-[24px]">
			<h1 className="text-[#f0f0f0] text-[28px] font-semibold leading-[36px]">
				{t('settings.title')}
			</h1>

			<div className="bg-[#161616] border border-[#2a2a2a] rounded-[12px] p-[24px] flex flex-col gap-[16px] max-w-[480px]">
				<div className="flex flex-col gap-[4px]">
					<span className="text-[#f0f0f0] text-[16px] font-medium">
						{t('settings.language.title')}
					</span>
					<span className="text-[#a0a0a0] text-[13px]">
						{t('settings.language.subtitle')}
					</span>
				</div>

				<div className="flex flex-col gap-[8px]">
					{LANGUAGES.map(({ code, key }) => {
						const isActive = i18n.language === code;
						return (
							<button
								key={code}
								type="button"
								onClick={() => i18n.changeLanguage(code)}
								className={`flex items-center gap-[12px] border rounded-[10px] px-[16px] py-[14px] text-left transition-colors ${
									isActive
										? 'border-[#1cc8a8] bg-[rgba(28,200,168,0.08)]'
										: 'border-[#2a2a2a] bg-[#1e1e1e] hover:border-[#3a3a3a]'
								}`}
							>
								<div
									className={`size-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
										isActive ? 'border-[#1cc8a8]' : 'border-[#606060]'
									}`}
								>
									{isActive && (
										<div className="size-[8px] rounded-full bg-[#1cc8a8]" />
									)}
								</div>
								<span
									className={`text-[14px] font-medium ${
										isActive ? 'text-[#f0f0f0]' : 'text-[#a0a0a0]'
									}`}
								>
									{t(key)}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
