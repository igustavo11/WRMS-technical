import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog';
import i18n from '~/i18n/config';

const LANGUAGES = [
	{ code: 'pt-BR', key: 'settings.language.ptBR' as const },
	{ code: 'en', key: 'settings.language.en' as const },
] as const;

type Props = {
	open: boolean;
	onClose: () => void;
};

export function SettingsModal({ open, onClose }: Props) {
	const { t } = useTranslation();

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="sm:max-w-[400px] bg-[#161616] border border-[#2a2a2a] text-[#f0f0f0] p-[21px]">
				<DialogTitle className="text-[#f0f0f0] text-[16px] font-medium">
					{t('settings.title')}
				</DialogTitle>

				<div className="flex flex-col gap-1 mt-4 mb-5">
					<span className="text-[#f0f0f0] text-[14px] font-medium">
						{t('settings.language.title')}
					</span>
					<span className="text-[#a0a0a0] text-[13px]">
						{t('settings.language.subtitle')}
					</span>
				</div>

				<div className="flex flex-col gap-2">
					{LANGUAGES.map(({ code, key }) => (
						<button
							key={code}
							type="button"
							onClick={() => i18n.changeLanguage(code)}
							className={`flex items-center gap-3 px-4 py-3 rounded-[8px] border text-left transition-colors ${
								i18n.language === code
									? 'bg-[rgba(28,200,168,0.12)] border-[#4ce4c3] text-[#4ce4c3]'
									: 'bg-[#1e1e1e] border-[#2a2a2a] text-[#bbcac4] hover:bg-[rgba(255,255,255,0.04)]'
							}`}
						>
							<div
								className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
									i18n.language === code
										? 'border-[#4ce4c3]'
										: 'border-[#606060]'
								}`}
							>
								{i18n.language === code && (
									<div className="size-2 rounded-full bg-[#4ce4c3]" />
								)}
							</div>
							<span className="text-[14px] font-medium">{t(key)}</span>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
