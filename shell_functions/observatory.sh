observatory () {
  if [[ -z "$( docker ps | grep website | awk '{print $NF}' )" ]]; then
    printf "Observatory website (and API) not running.  Have you run docker-compose up on the http-observatory Git repo?\n"
    return 1
  fi

  local DOCKER_IMAGE="mozilla/observatory-cli"
  local OBSERVATORY_NETWORK="$( docker network ls | grep observatory | awk '{print $2}' )"
  local OBSERVATORY_API="$( docker ps | grep website | awk '{print $NF}' )"
  local COMMAND="docker run --rm -it --name observatory-cli --net=$OBSERVATORY_NETWORK -e HTTPOBS_API_URL=http://$OBSERVATORY_API:57001/api/v1/ --link $OBSERVATORY_API"
  local ARGS="${@}"

  ## Allow entering the container to test by hand
  case "${1}" in
    debug)
      COMMAND="${COMMAND} --entrypoint=/bin/ash --user=root"
      unset ARGS
    ;;
  esac

  _check_docker_sock_perms
  _check_docker_image_installed "${DOCKER_IMAGE}"

  ${COMMAND} ${DOCKER_IMAGE} ${ARGS}
}
