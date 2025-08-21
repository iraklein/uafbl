import { Season } from '../types'

interface AdditionalOption {
  value: string
  label: string
}

interface SeasonSelectorProps {
  seasons: Season[]
  selectedSeason: string
  onSeasonChange: (seasonId: string) => void
  loading?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
  additionalOptions?: AdditionalOption[]
  seasonLabelFormatter?: (season: Season) => string
}

export default function SeasonSelector({
  seasons,
  selectedSeason,
  onSeasonChange,
  loading = false,
  placeholder = "Choose a season...",
  className = "px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-xs sm:text-sm w-22 sm:w-26",
  disabled = false,
  additionalOptions = [],
  seasonLabelFormatter
}: SeasonSelectorProps) {
  return (
    <select
      id="season-select"
      value={selectedSeason}
      onChange={(e) => onSeasonChange(e.target.value)}
      className={className}
      disabled={loading || disabled}
    >
      <option value="">{placeholder}</option>
      {additionalOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {seasons.map((season) => (
        <option key={season.id} value={season.id}>
          {seasonLabelFormatter ? seasonLabelFormatter(season) : season.name.replace(/\s*Season\s*/gi, '')}
        </option>
      ))}
    </select>
  )
}