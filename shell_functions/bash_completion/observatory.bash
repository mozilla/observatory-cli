# bash completion for observatory-cli
# Author: Jeremy Young
# Asurion 10/10/2016

_observatory_completion () {
	local CUR=${COMP_WORDS[COMP_CWORD]}
	local PREV=${COMP_WORDS[COMP_CWORD-1]}
	local OPTIONS_ALL="-h -V -z -q --help --version --format --min-grade --min-score --nagios \
--rescan --zero --attempts --api-version --skip --tls --quiet"
	local OPTIONS_BLANK=""
  local OPTIONS_FORMAT="json report csv url"
  local OPTIONS_GRADE="F D- D D+ C- C C+ B- B B+ A- A A+"

	case $PREV in
		-h|--help)
			COMPREPLY=( $( compgen -W "${OPTIONS_BLANK}" -- "${CUR}" ) )
			return 0
			;;
		-V|--version)
			COMPREPLY=( $( compgen -W "${OPTIONS_BLANK}" -- "${CUR}" ) )
			return 0
			;;
		--format)
			COMPREPLY=( $( compgen -W "${OPTIONS_FORMAT}" -- "${CUR}" ) )
			return 0
			;;
		--min-grade)
			COMPREPLY=( $( compgen -W "${OPTIONS_GRADE}" -- "${CUR}" ) )
			;;
    --min-score)
      COMPREPLY=( $( compgen -W "$( seq 1 100 )" -- "${CUR}" ) )
      ;;
    --nagios)
			## https://github.com/mozilla/observatory-cli/blob/master/index.js#L262
      COMPREPLY=( $( compgen -W "$( seq 1 3 )" -- "${CUR}" ) )
      ;;
    --rescan)
      COMPREPLY=( $( compgen -W "${OPTIONS_BLANK}" -- "${CUR}" ) )
      ;;
    -z|--zero)
      COMPREPLY=( $( compgen -W "${OPTIONS_BLANK}" -- "${CUR}" ) )
      ;;
    --attempts)
      ## 100 seems like a nice place to stop to determine if there was a failure connecting.
      COMPREPLY=( $( compgen -W "$( seq 1 100 )" -- "${CUR}" ) )
      ;;
    --api-version)
      ## Picking some ending value arbitrarily.  5 API versions is probably a lot.
      COMPREPLY=( $( compgen -W "$( seq 1 5 )" -- "${CUR}" ) )
      ;;
    --skip)
      COMPREPLY=( $( compgen -W "${OPTIONS_SKIP}" -- "${CUR}" ) )
      ;;
    --tls)
      COMPREPLY=( $( compgen -W "${OPTIONS_BLANK}" -- "${CUR}" ) )
      ;;
    -q|--quiet)
      COMPREPLY=( $( compgen -W "${OPTIONS_BLANK}" -- "${CUR}" ) )
      ;;
		*)
			if [[ "${CUR}" == -* ]]; then
				COMPREPLY=( $( compgen -W "${OPTIONS_ALL}" -- "${CUR}" ) )
			fi
			return 0
			;;
	esac
}

complete -F _observatory_completion observatory
